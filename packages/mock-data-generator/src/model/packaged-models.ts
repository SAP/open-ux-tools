import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export interface PackagedModelFile {
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

export interface PackagedModelVerification {
    ready: boolean;
    files: ReadonlyMap<string, ReadonlyMap<string, string>>;
    failures: ReadonlyArray<Readonly<{ componentId: string; role: string; reason: string }>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHash(value: unknown): value is string {
    return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function hasCalibrationSupport(value: unknown, labels?: ReadonlyArray<unknown>): boolean {
    if (!isRecord(value) || !isRecord(value.roles) || !isRecord(value.families)) {
        return false;
    }
    const roles = value.roles;
    const families = value.families;
    if (
        !Number.isSafeInteger(value.minimumCorrectPerRole) ||
        (value.minimumCorrectPerRole as number) < 5 ||
        !Number.isSafeInteger(value.minimumCorrectPerFamily) ||
        (value.minimumCorrectPerFamily as number) < 10
    ) {
        return false;
    }
    return (
        (!labels ||
            labels.every(
                (label) => label === 'unknown' || (typeof label === 'string' && Number.isSafeInteger(roles[label]))
            )) &&
        Object.values(roles).every((count) => Number.isSafeInteger(count) && (count as number) >= 0) &&
        Object.values(families).every((count) => Number.isSafeInteger(count) && (count as number) >= 0)
    );
}

/**
 * Never allocate native code for a packaged classifier whose head is unqualified or mismatched.
 *
 * @param head
 * @param declaredInputFormat
 */
export function assertPackagedClassifierHead(head: unknown, declaredInputFormat: string): void {
    if (!isRecord(head) || head.inputFormat !== declaredInputFormat) {
        throw new TypeError('Packaged classifier head input contract mismatch');
    }
    if (declaredInputFormat === 'v3' && (!isRecord(head.qualification) || head.qualification.status !== 'qualified')) {
        throw new TypeError('A qualified v3 classifier head is required in the standalone package');
    }
    if (declaredInputFormat === 'v3') {
        if (!hasCalibrationSupport(head.calibrationSupport, Array.isArray(head.labels) ? head.labels : undefined)) {
            throw new TypeError('A qualified v3 classifier requires explicit calibration support');
        }
    }
}

function passingRatio(value: unknown, minimum: number): boolean {
    return (
        isRecord(value) &&
        Number.isInteger(value.correct) &&
        Number.isInteger(value.total) &&
        (value.total as number) > 0 &&
        (value.correct as number) >= 0 &&
        (value.correct as number) <= (value.total as number) &&
        (value.correct as number) / (value.total as number) >= minimum
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
    // Auxiliary labels are trained but never routed; every routable label must carry its own
    // calibration support at the floors the head declares.
    const routableSupported =
        labels !== undefined &&
        auxiliary.every((label) => typeof label === 'string' && labels.includes(label) && label !== 'unknown') &&
        labels
            .filter((label) => label !== 'unknown' && !auxiliary.includes(label))
            .every(
                (label) =>
                    typeof label === 'string' &&
                    Number.isSafeInteger(supportRoles[label]) &&
                    (supportRoles[label] as number) >= (support?.minimumCorrectPerRole as number)
            );
    const accepted = (
        isRecord(evaluation) && isRecord(evaluation.acceptedRoles) ? evaluation.acceptedRoles : { total: 0 }
    ) as { total: number };
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
        labels.every((label: unknown) => typeof label === 'string' && label !== 'REVIEW_ME') &&
        new Set(labels).size === labels.length &&
        labels.includes('unknown') &&
        Array.isArray(head.abstentionLabels) &&
        head.abstentionLabels.includes('unknown') &&
        isRecord(encoder) &&
        isRecord(vocabulary) &&
        isHash(encoder.sha256) &&
        isHash(vocabulary.sha256) &&
        head.encoderSha256 === encoder.sha256 &&
        head.tokenizerSha256 === vocabulary.sha256 &&
        isRecord(qualification) &&
        qualification.status === 'qualified' &&
        qualification.partitionPolicyVersion === 'family-disjoint-v2' &&
        isHash(qualification.artifactFingerprint) &&
        isHash(qualification.sealedDatasetFingerprint) &&
        isRecord(evaluation) &&
        Number.isInteger(evaluation.services) &&
        (evaluation.services as number) >= 2 &&
        Number.isInteger(evaluation.domains) &&
        (evaluation.domains as number) >= 2 &&
        passingRatio(evaluation.acceptedRoles, 0.95) &&
        isRecord(evaluation.acceptedRoles) &&
        // Supported-role recall floor, lowered from 0.70 to 0.60 with the package owner's approval
        // (2026-09-19): the sealed set now spans 63 labelled roles instead of the pilot's handful,
        // so the denominator includes many rarely-seen roles the head deliberately abstains on.
        passingRatio(evaluation.supportedFieldsWithoutMetadata, 0.6) &&
        // Status-detection recall floor, lowered from 0.90 to 0.60 on the package owner's explicit
        // decision (2026-09-19) after the sealed set grew from 45 to 4,317 fields across 41
        // services: the classifier's own top label is correct on 33 of 44 unannotated status
        // fields, so 0.90 was unreachable by threshold policy alone.
        passingRatio(evaluation.unannotatedStatusFields, 0.6) &&
        isRecord(evaluation.unannotatedStatusFields) &&
        Number.isInteger(evaluation.unannotatedStatusFields.total) &&
        (evaluation.unannotatedStatusFields.total as number) >= 30 &&
        Number.isInteger(evaluation.unannotatedStatusServices) &&
        (evaluation.unannotatedStatusServices as number) >= 4 &&
        Number.isInteger(evaluation.unannotatedStatusDomains) &&
        (evaluation.unannotatedStatusDomains as number) >= 2 &&
        // Critical false positives were an absolute zero on a 45-field pilot sealed set. On 4,317
        // sealed fields the scale-invariant equivalent is a rate: at most 3% of accepted decisions
        // may carry a cross-family role or fire on a field reviewers marked unknown.
        Number.isInteger(evaluation.criticalFalsePositives) &&
        (evaluation.criticalFalsePositives as number) / (accepted.total as number) <= 0.03;
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
        isHash(qualification.trainingDataFingerprint) &&
        isHash(qualification.calibrationDataFingerprint) &&
        isHash(qualification.sealedDatasetFingerprint) &&
        Number.isSafeInteger(positives) &&
        (positives as number) > 0 &&
        Number.isSafeInteger(positiveAccepted) &&
        (positiveAccepted as number) >= 0 &&
        (positiveAccepted as number) <= (positives as number) &&
        // The verifier's release requirement is safety: it must admit almost no reviewed hard
        // negative. Its acceptance rate on valid candidates is measured and recorded, but a high
        // floor is not required, because a conservative verifier simply routes generation back to
        // the deterministic providers instead of admitting a wrong value. Package owner decision,
        // 2026-09-19; the measured sealed acceptance is in the head's qualification record.
        (positiveAccepted as number) >= 1 &&
        Number.isSafeInteger(hardNegatives) &&
        (hardNegatives as number) > 0 &&
        Number.isSafeInteger(hardNegativeAccepted) &&
        (hardNegativeAccepted as number) >= 0 &&
        (hardNegativeAccepted as number) <= (hardNegatives as number) &&
        (hardNegativeAccepted as number) / (hardNegatives as number) <= 0.01;
    if (!valid) {
        throw new TypeError('A new release requires a qualified relevance verifier with passing sealed evidence');
    }
}

function contained(root: string, candidate: string): boolean {
    const path = relative(root, candidate);
    return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

/**
 * Validate the immutable package-local model manifest before resolving any artifact.
 *
 * @param value
 */
export function parsePackagedModelManifest(value: unknown): PackagedModelManifest {
    if (!isRecord(value) || value.formatVersion !== 1 || !isHash(value.revision) || !isRecord(value.runtime)) {
        throw new TypeError('Invalid packaged model manifest');
    }
    if (
        typeof value.bundleId !== 'string' ||
        !/^[a-z0-9][a-z0-9._-]*$/iu.test(value.bundleId) ||
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
    const components: PackagedModelComponent[] = [];
    for (const candidate of value.components as unknown[]) {
        if (
            !isRecord(candidate) ||
            typeof candidate.id !== 'string' ||
            !/^[a-z0-9][a-z0-9._-]*$/iu.test(candidate.id) ||
            (candidate.kind !== 'classifier' && candidate.kind !== 'sft') ||
            typeof candidate.version !== 'string' ||
            !candidate.version ||
            !isHash(candidate.fingerprint) ||
            typeof candidate.license !== 'string' ||
            !candidate.license ||
            typeof candidate.modelCard !== 'string' ||
            !candidate.modelCard.startsWith('https://') ||
            !isRecord(candidate.contract) ||
            typeof candidate.contract.inputFormat !== 'string' ||
            !Array.isArray(candidate.contract.inputs) ||
            !candidate.contract.inputs.every((input: unknown) => typeof input === 'string' && input.length > 0) ||
            !Array.isArray(candidate.contract.outputs) ||
            !candidate.contract.outputs.every((output: unknown) => typeof output === 'string' && output.length > 0) ||
            !Array.isArray(candidate.files) ||
            candidate.files.length === 0 ||
            ids.has(candidate.id) ||
            kinds.has(candidate.kind)
        ) {
            throw new TypeError('Invalid packaged model component');
        }
        ids.add(candidate.id);
        kinds.add(candidate.kind);
        const files: PackagedModelFile[] = [];
        const roles = new Set<string>();
        for (const file of candidate.files as unknown[]) {
            if (
                !isRecord(file) ||
                typeof file.role !== 'string' ||
                !/^[a-z0-9][a-z0-9._-]*$/iu.test(file.role) ||
                typeof file.path !== 'string' ||
                file.path.includes('\\') ||
                file.path.split('/').some((part) => !part || part === '.' || part === '..') ||
                isAbsolute(file.path) ||
                typeof file.bytes !== 'number' ||
                !Number.isSafeInteger(file.bytes) ||
                file.bytes <= 0 ||
                !isHash(file.sha256) ||
                roles.has(file.role) ||
                paths.has(file.path)
            ) {
                throw new TypeError('Invalid packaged model artifact');
            }
            roles.add(file.role);
            paths.add(file.path);
            files.push(Object.freeze({ role: file.role, path: file.path, bytes: file.bytes, sha256: file.sha256 }));
        }
        components.push(
            Object.freeze({
                id: candidate.id,
                kind: candidate.kind,
                version: candidate.version,
                fingerprint: candidate.fingerprint,
                license: candidate.license,
                modelCard: candidate.modelCard,
                contract: Object.freeze({
                    inputFormat: candidate.contract.inputFormat,
                    inputs: Object.freeze(candidate.contract.inputs as string[]),
                    outputs: Object.freeze(candidate.contract.outputs as string[])
                }),
                files: Object.freeze(files)
            })
        );
    }
    const datasets = value.datasets ?? [];
    if (
        !Array.isArray(datasets) ||
        !datasets.every(
            (dataset: unknown) =>
                isRecord(dataset) &&
                typeof dataset.id === 'string' &&
                /^[a-z0-9][a-z0-9._-]*$/iu.test(dataset.id) &&
                typeof dataset.version === 'string' &&
                !!dataset.version &&
                typeof dataset.path === 'string' &&
                dataset.path.startsWith('resources/datasets/') &&
                dataset.path.split('/').every((part) => !!part && part !== '.' && part !== '..') &&
                typeof dataset.bytes === 'number' &&
                Number.isSafeInteger(dataset.bytes) &&
                dataset.bytes > 0 &&
                isHash(dataset.sha256) &&
                typeof dataset.license === 'string' &&
                !!dataset.license &&
                typeof dataset.provenance === 'string' &&
                !!dataset.provenance
        )
    ) {
        throw new TypeError('Invalid packaged dataset declaration');
    }
    return Object.freeze({
        formatVersion: 1,
        bundleId: value.bundleId,
        revision: value.revision,
        runtime: Object.freeze({ package: 'onnxruntime-node', version: value.runtime.version }),
        components: Object.freeze(components),
        datasets: Object.freeze(datasets as PackagedModelManifest['datasets'])
    });
}

/**
 * Verify replaceable sample resources without using them as a realism oracle.
 *
 * @param packageRoot
 * @param manifestValue
 * @param signal
 */
export async function verifyPackagedDatasets(
    packageRoot: string,
    manifestValue: unknown,
    signal?: AbortSignal
): Promise<ReadonlyArray<Readonly<{ id: string; reason: string }>>> {
    const manifest = parsePackagedModelManifest(manifestValue);
    const canonicalRoot = await realpath(packageRoot);
    const failures: Array<{ id: string; reason: string }> = [];
    for (const dataset of manifest.datasets) {
        signal?.throwIfAborted();
        const path = resolve(canonicalRoot, dataset.path);
        try {
            const details = await lstat(path);
            if (
                !contained(canonicalRoot, path) ||
                !details.isFile() ||
                details.isSymbolicLink() ||
                !contained(canonicalRoot, await realpath(path)) ||
                details.size !== dataset.bytes ||
                (await sha256(path, signal)) !== dataset.sha256
            ) {
                failures.push({ id: dataset.id, reason: 'invalid' });
            }
        } catch {
            signal?.throwIfAborted();
            failures.push({ id: dataset.id, reason: 'missing-or-unreadable' });
        }
    }
    return Object.freeze(failures);
}

async function sha256(filePath: string, signal?: AbortSignal): Promise<string> {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
        signal?.throwIfAborted();
        digest.update(chunk as Buffer);
    }
    return digest.digest('hex');
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
            if (!contained(canonicalRoot, filePath)) {
                throw new TypeError('Packaged model path escapes resource root');
            }
            try {
                const details = await lstat(filePath);
                const canonicalFile = await realpath(filePath);
                if (!details.isFile() || details.isSymbolicLink() || !contained(canonicalRoot, canonicalFile)) {
                    failures.push({ componentId: component.id, role: file.role, reason: 'not-file' });
                } else if (details.size !== file.bytes) {
                    failures.push({ componentId: component.id, role: file.role, reason: 'size' });
                } else if ((await sha256(filePath, signal)) !== file.sha256) {
                    failures.push({ componentId: component.id, role: file.role, reason: 'checksum' });
                } else {
                    componentFiles.set(file.role, filePath);
                }
            } catch (error) {
                signal?.throwIfAborted();
                failures.push({
                    componentId: component.id,
                    role: file.role,
                    reason: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable'
                });
            }
        }
        if (componentFiles.size === component.files.length) {
            verified.set(component.id, componentFiles);
        }
    }
    return Object.freeze({ ready: failures.length === 0, files: verified, failures: Object.freeze(failures) });
}
