import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { errnoCode, isPathInside, isRecord, isSha256Hex } from '../guards.js';
import { sha256File } from '../hash.js';

interface PackagedModelFile {
    role: string;
    path: string;
    bytes: number;
    sha256: string;
}

export interface PackagedModelComponent {
    id: string;
    kind: 'classifier' | 'sft';
    version: string;
    fingerprint: string;
    license: string;
    modelCard: string;
    contract: Readonly<{ inputFormat: string; inputs: ReadonlyArray<string>; outputs: ReadonlyArray<string> }>;
    files: ReadonlyArray<PackagedModelFile>;
}

export interface PackagedModelManifest {
    formatVersion: 1;
    bundleId: string;
    revision: string;
    runtime: Readonly<{ package: 'onnxruntime-node'; version: string }>;
    components: ReadonlyArray<PackagedModelComponent>;
    datasets: ReadonlyArray<
        Readonly<{
            id: string;
            version: string;
            path: string;
            bytes: number;
            sha256: string;
            license: string;
            provenance: string;
        }>
    >;
}

interface PackagedModelVerification {
    ready: boolean;
    files: ReadonlyMap<string, ReadonlyMap<string, string>>;
    failures: ReadonlyArray<Readonly<{ componentId: string; role: string; reason: string }>>;
}

/** The package directories that hold declared data resources: value banks and semantic rules. */
const PACKAGED_DATASET_DIRECTORIES = ['resources/banks/', 'resources/rules/'];

/**
 * Whether a declared dataset path lies in a data-resource directory of the package.
 *
 * @param path package-relative path
 * @returns true for a value-bank or rule resource path
 */
function isPackagedDatasetPath(path: string): boolean {
    return PACKAGED_DATASET_DIRECTORIES.some((directory) => path.startsWith(directory));
}

type PackagedDataset = PackagedModelManifest['datasets'][number];

/** Identifiers of bundles, components, artifact roles and datasets. */
const MANIFEST_IDENTIFIER = /^[a-z0-9][a-z0-9._-]*$/iu;

/**
 * Narrow an unknown manifest field to an integer.
 *
 * @param value field to check
 * @returns true for an integer number
 */
function isInteger(value: unknown): value is number {
    return Number.isInteger(value);
}

/**
 * Narrow an unknown manifest field to a safe integer.
 *
 * @param value field to check
 * @returns true for an integer number within the safe range
 */
function isSafeInteger(value: unknown): value is number {
    return Number.isSafeInteger(value);
}

/**
 * Whether a value is an array of non-empty strings.
 *
 * @param value field to check
 * @returns true for an array whose items are all non-empty strings
 */
function isNonEmptyStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' && item.length > 0);
}

function hasCalibrationSupport(value: unknown, labels?: ReadonlyArray<unknown>): boolean {
    if (!isRecord(value) || !isRecord(value.roles) || !isRecord(value.families)) {
        return false;
    }
    const roles = value.roles;
    const families = value.families;
    if (
        !isSafeInteger(value.minimumCorrectPerRole) ||
        value.minimumCorrectPerRole < 5 ||
        !isSafeInteger(value.minimumCorrectPerFamily) ||
        value.minimumCorrectPerFamily < 10
    ) {
        return false;
    }
    return (
        (!labels ||
            labels.every(
                (label) => label === 'unknown' || (typeof label === 'string' && Number.isSafeInteger(roles[label]))
            )) &&
        Object.values(roles).every((count) => isSafeInteger(count) && count >= 0) &&
        Object.values(families).every((count) => isSafeInteger(count) && count >= 0)
    );
}

/**
 * Never allocate native code for a packaged classifier whose head is unqualified or mismatched.
 *
 * @param head
 * @param declaredInputFormat
 */
export function assertPackagedClassifierHead(head: unknown, declaredInputFormat: string): void {
    if (declaredInputFormat !== 'v3' || !isRecord(head) || head.inputFormat !== declaredInputFormat) {
        throw new TypeError('Packaged classifier head input contract mismatch');
    }
    if (!isRecord(head.qualification) || head.qualification.status !== 'qualified') {
        throw new TypeError('A qualified v3 classifier head is required in the standalone package');
    }
    if (!hasCalibrationSupport(head.calibrationSupport, Array.isArray(head.labels) ? head.labels : undefined)) {
        throw new TypeError('A qualified v3 classifier requires explicit calibration support');
    }
}

function passingRatio(value: unknown, minimum: number): boolean {
    return (
        isRecord(value) &&
        isInteger(value.correct) &&
        isInteger(value.total) &&
        value.total > 0 &&
        value.correct >= 0 &&
        value.correct <= value.total &&
        value.correct / value.total >= minimum
    );
}

/**
 * Require one role classifier with reviewed, passing evidence for a new standalone release.
 *
 * @param manifest
 * @param head
 */
export function assertReleaseClassifier(manifest: unknown, head: unknown): void {
    const components: ReadonlyArray<unknown> =
        isRecord(manifest) && Array.isArray(manifest.components) ? manifest.components : [];
    const classifiers = components.filter(
        (component: unknown) => isRecord(component) && component.kind === 'classifier'
    );
    const classifier = classifiers[0];
    const qualification = isRecord(head) ? head.qualification : undefined;
    const evaluation = isRecord(qualification) ? qualification.sealedEvaluation : undefined;
    const files: ReadonlyArray<unknown> =
        isRecord(classifier) && Array.isArray(classifier.files) ? classifier.files : [];
    const encoder = files.find((file: unknown) => isRecord(file) && file.role === 'encoder');
    const vocabulary = files.find((file: unknown) => isRecord(file) && file.role === 'vocabulary');
    const labels = isRecord(head) && Array.isArray(head.labels) ? head.labels : undefined;
    const auxiliary: ReadonlyArray<unknown> =
        isRecord(head) && Array.isArray(head.auxiliaryLabels) ? head.auxiliaryLabels : [];
    const support = isRecord(head) && isRecord(head.calibrationSupport) ? head.calibrationSupport : undefined;
    const supportRoles = support && isRecord(support.roles) ? support.roles : {};
    const minimumPerRole = support?.minimumCorrectPerRole;
    // Auxiliary labels are trained but never routed; every routable label must carry its own
    // calibration support at the floors the head declares. A floor that is not an integer fails
    // `hasCalibrationSupport` below, so the release is rejected either way.
    const routableSupported =
        labels !== undefined &&
        auxiliary.every((label) => typeof label === 'string' && labels.includes(label) && label !== 'unknown') &&
        labels
            .filter((label) => label !== 'unknown' && !auxiliary.includes(label))
            .every((label) => {
                const count = typeof label === 'string' ? supportRoles[label] : undefined;
                return isSafeInteger(count) && isSafeInteger(minimumPerRole) && count >= minimumPerRole;
            });
    const valid =
        classifiers.length === 1 &&
        routableSupported &&
        isRecord(classifier) &&
        isRecord(classifier.contract) &&
        classifier.contract.inputFormat === 'v3' &&
        isRecord(head) &&
        head.inputFormat === 'v3' &&
        hasCalibrationSupport(head.calibrationSupport, labels) &&
        labels !== undefined &&
        labels.every((label: unknown) => typeof label === 'string') &&
        new Set(labels).size === labels.length &&
        labels.includes('unknown') &&
        Array.isArray(head.abstentionLabels) &&
        head.abstentionLabels.includes('unknown') &&
        isRecord(encoder) &&
        isRecord(vocabulary) &&
        isSha256Hex(encoder.sha256) &&
        isSha256Hex(vocabulary.sha256) &&
        head.encoderSha256 === encoder.sha256 &&
        head.tokenizerSha256 === vocabulary.sha256 &&
        isRecord(qualification) &&
        qualification.status === 'qualified' &&
        qualification.partitionPolicyVersion === 'family-disjoint-v2' &&
        isSha256Hex(qualification.artifactFingerprint) &&
        isSha256Hex(qualification.sealedDatasetFingerprint) &&
        isRecord(evaluation) &&
        isInteger(evaluation.services) &&
        evaluation.services >= 2 &&
        isInteger(evaluation.domains) &&
        evaluation.domains >= 2 &&
        passingRatio(evaluation.acceptedRoles, 0.95) &&
        isRecord(evaluation.acceptedRoles) &&
        // Supported-role recall includes fields on which the head abstains.
        passingRatio(evaluation.supportedFieldsWithoutMetadata, 0.6) &&
        // Status-detection recall is measured separately on unannotated status fields.
        passingRatio(evaluation.unannotatedStatusFields, 0.6) &&
        isRecord(evaluation.unannotatedStatusFields) &&
        isInteger(evaluation.unannotatedStatusFields.total) &&
        evaluation.unannotatedStatusFields.total >= 30 &&
        isInteger(evaluation.unannotatedStatusServices) &&
        evaluation.unannotatedStatusServices >= 4 &&
        isInteger(evaluation.unannotatedStatusDomains) &&
        evaluation.unannotatedStatusDomains >= 2 &&
        // At most 3% of accepted decisions may carry a cross-family role or classify an unknown field.
        // `passingRatio` above already required an integer, positive accepted total.
        isInteger(evaluation.criticalFalsePositives) &&
        isInteger(evaluation.acceptedRoles.total) &&
        evaluation.criticalFalsePositives / evaluation.acceptedRoles.total <= 0.03;
    if (!valid) {
        throw new TypeError('A new release requires one qualified classifier with passing sealed evidence');
    }
}

/**
 * Reject a relevance verifier without independently measured sealed candidate results.
 *
 * @param head
 */
export function assertReleaseRelevanceHead(head: unknown): void {
    const qualification = isRecord(head) ? head.qualification : undefined;
    const evaluation = isRecord(qualification) ? qualification.sealedEvaluation : undefined;
    const positiveAccepted = isRecord(evaluation) ? evaluation.positiveAccepted : undefined;
    const positives = isRecord(evaluation) ? evaluation.positives : undefined;
    const hardNegativeAccepted = isRecord(evaluation) ? evaluation.hardNegativeAccepted : undefined;
    const hardNegatives = isRecord(evaluation) ? evaluation.hardNegatives : undefined;
    const valid =
        isRecord(qualification) &&
        qualification.status === 'qualified' &&
        qualification.partitionPolicyVersion === 'service-disjoint-v1' &&
        isSha256Hex(qualification.trainingDataFingerprint) &&
        isSha256Hex(qualification.calibrationDataFingerprint) &&
        isSha256Hex(qualification.sealedDatasetFingerprint) &&
        isSafeInteger(positives) &&
        positives > 0 &&
        isSafeInteger(positiveAccepted) &&
        positiveAccepted >= 0 &&
        positiveAccepted <= positives &&
        // The verifier's release requirement is safety: it must admit almost no reviewed hard
        // negative. Its acceptance rate on valid candidates is measured and recorded, but a high
        // floor is not required, because a conservative verifier simply routes generation back to
        // the deterministic providers instead of admitting a wrong value.
        positiveAccepted >= 1 &&
        isSafeInteger(hardNegatives) &&
        hardNegatives > 0 &&
        isSafeInteger(hardNegativeAccepted) &&
        hardNegativeAccepted >= 0 &&
        hardNegativeAccepted <= hardNegatives &&
        hardNegativeAccepted / hardNegatives <= 0.01;
    if (!valid) {
        throw new TypeError('A new release requires a qualified relevance verifier with passing sealed evidence');
    }
}

/**
 * Validate one declared artifact of a component, rejecting a role or path already declared.
 *
 * @param file the declared artifact
 * @param roles roles already declared by the component; receives this artifact's role
 * @param paths paths already declared by the manifest; receives this artifact's path
 * @returns the frozen artifact declaration
 * @throws {TypeError} when the artifact is malformed or duplicated
 */
function parseModelFile(file: unknown, roles: Set<string>, paths: Set<string>): PackagedModelFile {
    if (
        !isRecord(file) ||
        typeof file.role !== 'string' ||
        !MANIFEST_IDENTIFIER.test(file.role) ||
        typeof file.path !== 'string' ||
        file.path.includes('\\') ||
        file.path.split('/').some((part) => !part || part === '.' || part === '..') ||
        isAbsolute(file.path) ||
        typeof file.bytes !== 'number' ||
        !Number.isSafeInteger(file.bytes) ||
        file.bytes <= 0 ||
        !isSha256Hex(file.sha256) ||
        roles.has(file.role) ||
        paths.has(file.path)
    ) {
        throw new TypeError('Invalid packaged model artifact');
    }
    roles.add(file.role);
    paths.add(file.path);
    return Object.freeze({ role: file.role, path: file.path, bytes: file.bytes, sha256: file.sha256 });
}

/**
 * Validate one model component and its artifacts, rejecting an id or kind already declared.
 *
 * @param candidate the declared component
 * @param ids component ids already declared; receives this component's id
 * @param kinds component kinds already declared; receives this component's kind
 * @param paths artifact paths already declared by the manifest; receives this component's paths
 * @returns the frozen component
 * @throws {TypeError} when the component or one of its artifacts is malformed or duplicated
 */
function parseModelComponent(
    candidate: unknown,
    ids: Set<string>,
    kinds: Set<string>,
    paths: Set<string>
): PackagedModelComponent {
    if (
        !isRecord(candidate) ||
        typeof candidate.id !== 'string' ||
        !MANIFEST_IDENTIFIER.test(candidate.id) ||
        (candidate.kind !== 'classifier' && candidate.kind !== 'sft') ||
        typeof candidate.version !== 'string' ||
        !candidate.version ||
        !isSha256Hex(candidate.fingerprint) ||
        typeof candidate.license !== 'string' ||
        !candidate.license ||
        typeof candidate.modelCard !== 'string' ||
        !candidate.modelCard.startsWith('https://') ||
        !isRecord(candidate.contract) ||
        typeof candidate.contract.inputFormat !== 'string' ||
        !isNonEmptyStringArray(candidate.contract.inputs) ||
        !isNonEmptyStringArray(candidate.contract.outputs) ||
        !Array.isArray(candidate.files) ||
        candidate.files.length === 0 ||
        ids.has(candidate.id) ||
        kinds.has(candidate.kind)
    ) {
        throw new TypeError('Invalid packaged model component');
    }
    ids.add(candidate.id);
    kinds.add(candidate.kind);
    const roles = new Set<string>();
    const declaredFiles: unknown[] = candidate.files;
    const files = declaredFiles.map((file) => parseModelFile(file, roles, paths));
    return Object.freeze({
        id: candidate.id,
        kind: candidate.kind,
        version: candidate.version,
        fingerprint: candidate.fingerprint,
        license: candidate.license,
        modelCard: candidate.modelCard,
        contract: Object.freeze({
            inputFormat: candidate.contract.inputFormat,
            inputs: Object.freeze(candidate.contract.inputs),
            outputs: Object.freeze(candidate.contract.outputs)
        }),
        files: Object.freeze(files)
    });
}

/**
 * Whether a value is a well-formed declaration of a packaged data resource.
 *
 * @param dataset the declared dataset
 * @returns true when every field is present and well formed and the path names a data-resource file
 */
function isDatasetDeclaration(dataset: unknown): dataset is PackagedDataset {
    return (
        isRecord(dataset) &&
        typeof dataset.id === 'string' &&
        MANIFEST_IDENTIFIER.test(dataset.id) &&
        typeof dataset.version === 'string' &&
        !!dataset.version &&
        typeof dataset.path === 'string' &&
        isPackagedDatasetPath(dataset.path) &&
        dataset.path.split('/').every((part) => !!part && part !== '.' && part !== '..') &&
        typeof dataset.bytes === 'number' &&
        Number.isSafeInteger(dataset.bytes) &&
        dataset.bytes > 0 &&
        isSha256Hex(dataset.sha256) &&
        typeof dataset.license === 'string' &&
        !!dataset.license &&
        typeof dataset.provenance === 'string' &&
        !!dataset.provenance
    );
}

/**
 * Validate the immutable package-local model manifest before resolving any artifact.
 *
 * @param value
 */
export function parsePackagedModelManifest(value: unknown): PackagedModelManifest {
    if (!isRecord(value) || value.formatVersion !== 1 || !isSha256Hex(value.revision) || !isRecord(value.runtime)) {
        throw new TypeError('Invalid packaged model manifest');
    }
    if (
        typeof value.bundleId !== 'string' ||
        !MANIFEST_IDENTIFIER.test(value.bundleId) ||
        value.runtime.package !== 'onnxruntime-node' ||
        typeof value.runtime.version !== 'string' ||
        !/^\d+\.\d+\.\d+$/u.test(value.runtime.version) ||
        !Array.isArray(value.components) ||
        value.components.length === 0
    ) {
        throw new TypeError('Invalid packaged model manifest');
    }
    const ids = new Set<string>();
    const kinds = new Set<string>();
    const paths = new Set<string>();
    const declaredComponents: unknown[] = value.components;
    const components = declaredComponents.map((candidate) => parseModelComponent(candidate, ids, kinds, paths));
    const datasets: unknown = value.datasets ?? [];
    if (!Array.isArray(datasets) || !datasets.every(isDatasetDeclaration)) {
        throw new TypeError('Invalid packaged dataset declaration');
    }
    return Object.freeze({
        formatVersion: 1,
        bundleId: value.bundleId,
        revision: value.revision,
        runtime: Object.freeze({ package: 'onnxruntime-node', version: value.runtime.version }),
        components: Object.freeze(components),
        datasets: Object.freeze(datasets)
    });
}

/** Prefix of the declared dataset paths: they are relative to the package root and lie in its `resources/`. */
export const RESOURCES_PREFIX = 'resources/';

/**
 * Verify the declared data resources found below a root against their manifest size and checksum.
 *
 * @param root the directory the dataset paths are resolved against
 * @param datasets the declared datasets
 * @param relativePath the path of a dataset below the root
 * @param signal cancellation
 * @returns the failed datasets with the reason
 */
async function verifyDatasetFiles(
    root: string,
    datasets: ReadonlyArray<PackagedDataset>,
    relativePath: (dataset: PackagedDataset) => string,
    signal?: AbortSignal
): Promise<ReadonlyArray<Readonly<{ id: string; reason: string }>>> {
    const canonicalRoot = await realpath(root);
    const failures: Array<{ id: string; reason: string }> = [];
    for (const dataset of datasets) {
        signal?.throwIfAborted();
        const path = resolve(canonicalRoot, relativePath(dataset));
        try {
            const details = await lstat(path);
            if (
                !isPathInside(canonicalRoot, path) ||
                !details.isFile() ||
                details.isSymbolicLink() ||
                !isPathInside(canonicalRoot, await realpath(path)) ||
                details.size !== dataset.bytes ||
                (await sha256File(path, signal)) !== dataset.sha256
            ) {
                failures.push({ id: dataset.id, reason: 'invalid' });
            }
        } catch (error) {
            signal?.throwIfAborted();
            // File-system failures (missing, unreadable, a dangling link) make the dataset unusable; any
            // other failure is a defect and propagates.
            if (errnoCode(error) === undefined) {
                throw error;
            }
            failures.push({ id: dataset.id, reason: 'missing-or-unreadable' });
        }
    }
    return Object.freeze(failures);
}

/**
 * Verify the packaged value-bank store (and any other declared data resource) against its manifest
 * size and checksum, without using it as a realism oracle.
 *
 * @param packageRoot the package directory the dataset paths are relative to
 * @param manifestValue the manifest
 * @param signal cancellation
 * @returns the failed datasets with the reason
 */
export async function verifyPackagedDatasets(
    packageRoot: string,
    manifestValue: unknown,
    signal?: AbortSignal
): Promise<ReadonlyArray<Readonly<{ id: string; reason: string }>>> {
    const manifest = parsePackagedModelManifest(manifestValue);
    return verifyDatasetFiles(packageRoot, manifest.datasets, (dataset) => dataset.path, signal);
}

/**
 * Verify the declared data resources below a relocated resource root: a copy of the package's `resources/`
 * directory, so `resources/banks/x.json` is read from `<resourceRoot>/banks/x.json`.
 *
 * @param resourceRoot the relocated `resources/` directory
 * @param manifestValue the manifest
 * @param ids the datasets to verify; all when absent
 * @param signal cancellation
 * @returns the failed datasets with the reason
 */
export async function verifyDatasetsBelowResourceRoot(
    resourceRoot: string,
    manifestValue: unknown,
    ids?: ReadonlySet<string>,
    signal?: AbortSignal
): Promise<ReadonlyArray<Readonly<{ id: string; reason: string }>>> {
    const manifest = parsePackagedModelManifest(manifestValue);
    return verifyDatasetFiles(
        resourceRoot,
        manifest.datasets.filter(({ id }) => ids === undefined || ids.has(id)),
        // Every declared dataset path starts with the prefix (isDatasetDeclaration).
        (dataset) => dataset.path.slice(RESOURCES_PREFIX.length),
        signal
    );
}

/**
 * Check size, checksum and containment of each package artifact without allocating native sessions.
 *
 * @param resourceRoot
 * @param manifestValue
 * @param signal
 */
export async function verifyPackagedModels(
    resourceRoot: string,
    manifestValue: unknown,
    signal?: AbortSignal
): Promise<PackagedModelVerification> {
    const manifest = parsePackagedModelManifest(manifestValue);
    const canonicalRoot = await realpath(resourceRoot);
    const rootDetails = await lstat(resourceRoot);
    if (!rootDetails.isDirectory() || rootDetails.isSymbolicLink()) {
        throw new TypeError('Packaged model root must be a regular directory');
    }
    const verified = new Map<string, ReadonlyMap<string, string>>();
    const failures: Array<{ componentId: string; role: string; reason: string }> = [];
    for (const component of manifest.components) {
        const componentFiles = new Map<string, string>();
        for (const file of component.files) {
            signal?.throwIfAborted();
            const filePath = resolve(canonicalRoot, file.path);
            if (!isPathInside(canonicalRoot, filePath)) {
                throw new TypeError('Packaged model path escapes resource root');
            }
            try {
                const details = await lstat(filePath);
                const canonicalFile = await realpath(filePath);
                if (!details.isFile() || details.isSymbolicLink() || !isPathInside(canonicalRoot, canonicalFile)) {
                    failures.push({ componentId: component.id, role: file.role, reason: 'not-file' });
                } else if (details.size !== file.bytes) {
                    failures.push({ componentId: component.id, role: file.role, reason: 'size' });
                } else if ((await sha256File(filePath, signal)) !== file.sha256) {
                    failures.push({ componentId: component.id, role: file.role, reason: 'checksum' });
                } else {
                    componentFiles.set(file.role, filePath);
                }
            } catch (error) {
                signal?.throwIfAborted();
                // Only file-system failures mark the artifact missing or unreadable; any other failure propagates.
                if (errnoCode(error) === undefined) {
                    throw error;
                }
                failures.push({
                    componentId: component.id,
                    role: file.role,
                    reason: errnoCode(error) === 'ENOENT' ? 'missing' : 'unreadable'
                });
            }
        }
        if (componentFiles.size === component.files.length) {
            verified.set(component.id, componentFiles);
        }
    }
    return Object.freeze({ ready: failures.length === 0, files: verified, failures: Object.freeze(failures) });
}
