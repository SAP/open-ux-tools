import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import type {
    MockDataGenerationProgress,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorInspectionOptions,
    MockDataGeneratorInspectionV1,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataServiceRequest
} from './types.js';
import type { LearnedRuntimeDiagnostic, LearnedRuntimeHandle } from './model/learned-runtime.js';
import { openFileCompletionStore, type FileCompletionStore } from './model/file-completion-store.js';
import type { VerifiedModelArtifacts } from './model/runtime-artifacts.js';
import {
    parsePackagedModelManifest,
    assertPackagedClassifierHead,
    verifyDatasetsBelowResourceRoot,
    verifyPackagedModels,
    type PackagedModelManifest
} from './model/packaged-models.js';
import { createLearnedRuntime, generateServiceWithSchema, inspectService } from './index.js';
import { parseServiceMetadata } from './schema/parse-metadata.js';
import type { SchemaGraph } from './schema/graph.js';
import {
    ROLE_REGISTRY_ID,
    ROLE_REGISTRY_PATH,
    packagedRoleRegistry,
    semanticRoleDefinition
} from './semantics/role-registry.js';
import { VALUE_BANK_STORE_ID, VALUE_BANK_STORE_PATH, packagedBanks } from './semantics/bank-store.js';
import { SEMANTIC_RULE_STORE_ID, SEMANTIC_RULE_STORE_PATH, packagedSemanticRules } from './semantics/rule-store.js';
import { authoredDomainValues } from './generation/value-list-context.js';
import {
    DATA_EDITOR_SFT_BUDGET_MS,
    DATA_EDITOR_SFT_DEADLINE_MS,
    DATA_EDITOR_SFT_ENTITY_TIMEOUT_MS,
    DATA_EDITOR_SFT_MODEL_ROWS
} from './limits.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { errorMessage } from './guards.js';
import { t } from './i18n.js';
import { claimDomainResourceRoot, packageDirectory, packageResourceRoot } from './resource-root.js';

/** Where a session reads the shipped resources from. */
interface ResourceLocation {
    /** The resource root: the directory holding `models/`, `banks/` and `rules/`. */
    root: string;
    /** The model directory holding `manifest.json` and the model artifacts. */
    models: string;
    /** The model manifest. */
    manifest: string;
}

/**
 * The resource locations below a resource root.
 *
 * @param resourceRoot the resource root; the package's own `resources/` directory when absent
 * @returns the resource locations
 */
function resourceLocation(resourceRoot?: string): ResourceLocation {
    const root = resolve(resourceRoot ?? packageResourceRoot());
    const models = join(root, 'models');
    return Object.freeze({ root, models, manifest: join(models, 'manifest.json') });
}

export interface MockDataGeneratorInfo {
    /**
     * The public API version. Hosts pin it and refuse another one; it changes only with an incompatible
     * change to the exported functions or their result shapes.
     */
    apiVersion: 2;
    /**
     * Always true in API version 2: the semantic tiers ship with the package. Kept for API version 2 hosts. It
     * says nothing about the realism of a run's values; each result's `realism` does.
     */
    realismReady: true;
    model: Readonly<{ bundleId: string; revision: string; classifier: string; sft: string }>;
    runtime: Readonly<{ package: 'onnxruntime-node'; version: string }>;
}

export interface StandaloneGenerationResult extends MockDataGeneratorResult {
    executionMode: 'learned' | 'hybrid' | 'deterministic';
    validation: Readonly<{
        passed: boolean;
        formats: boolean;
        relationships: boolean;
        domainMeaning: 'evidence-verified' | 'synthetic-unverified' | 'unsupported' | 'not-applicable';
    }>;
    semanticCoverage: Readonly<{
        eligibleFields: number;
        routedFields: number;
        formatValidatedFields: number;
        structuralOnlyFields: number;
        unsupportedFields: number;
        evidenceVerifiedFields: number;
        syntheticUnverifiedFields: number;
    }>;
    modelRevision: string;
}

export type StandaloneGenerationOptions = MockDataGeneratorOptions;

export interface MockDataGenerator {
    generateService(
        request: MockDataServiceRequest,
        options?: StandaloneGenerationOptions
    ): Promise<StandaloneGenerationResult>;
    inspectService(
        request: MockDataServiceRequest,
        options?: StandaloneGenerationOptions,
        inspectionOptions?: MockDataGeneratorInspectionOptions
    ): Promise<MockDataGeneratorInspectionV1>;
    dispose(): Promise<void>;
}

/** Options of {@link getMockDataGeneratorInfo}. */
export interface MockDataGeneratorInfoOptions {
    /** Absolute resource root; see {@link CreateMockDataGeneratorOptions.resourceRoot}. */
    resourceRoot?: string;
}

export interface CreateMockDataGeneratorOptions {
    /**
     * Budget preset named after the host's purpose; explicit generation options always win.
     * - `api` (default) and `start-mock`: no preset, the defaults of the generation options apply.
     * - `data-editor`: an interactive editor waits for the result, so the SFT tier is bounded by
     *   `DATA_EDITOR_SFT_BUDGET_MS`, `DATA_EDITOR_SFT_ENTITY_TIMEOUT_MS`, `DATA_EDITOR_SFT_MODEL_ROWS`
     *   and `DATA_EDITOR_SFT_DEADLINE_MS` of `src/limits.ts`.
     */
    executionMode?: 'api' | 'data-editor' | 'start-mock';
    onProgress?: (event: MockDataGenerationProgress) => void;
    /**
     * Absolute directory, owned by the caller, where model answers are kept between processes: an
     * identical request (same model, prompt, fields and seed) then returns the same values without running
     * the model, and the time budget goes to the requests not seen yet. In memory for the process when absent.
     */
    answerCacheDirectory?: string;
    /**
     * Absolute directory holding the shipped resources (`models/`, `banks/`, `rules/`); the package's own
     * `resources/` directory by default. A host that bundles the package (for example with esbuild) copies
     * the package's `resources/` directory and points here. The model manifest and the model artifacts are
     * read from it; its data resources must match the manifest's SHA-256 digests. The value-bank store,
     * rule store and role registry the generator uses are read when the package loads, relative to the
     * package's own modules; the manifest found here must declare exactly those bytes.
     */
    resourceRoot?: string;
}

// Execution modes are budget presets named by the host's purpose; explicit generation options always win.
const EXECUTION_MODE_DEFAULTS: Readonly<
    Record<NonNullable<CreateMockDataGeneratorOptions['executionMode']>, StandaloneGenerationOptions>
> = Object.freeze({
    api: Object.freeze({}),
    'start-mock': Object.freeze({}),
    'data-editor': Object.freeze({
        sftBudgetMs: DATA_EDITOR_SFT_BUDGET_MS,
        sftTimeoutMs: DATA_EDITOR_SFT_ENTITY_TIMEOUT_MS,
        sftModelRows: DATA_EDITOR_SFT_MODEL_ROWS,
        sftDeadlineMs: DATA_EDITOR_SFT_DEADLINE_MS
    })
});

/**
 * Generation options an execution mode applies unless the caller sets them. Internal to the package.
 *
 * @param executionMode the generator's execution mode
 * @returns the mode's default options
 */
export function executionModeDefaults(
    executionMode: CreateMockDataGeneratorOptions['executionMode'] = 'api'
): StandaloneGenerationOptions {
    return EXECUTION_MODE_DEFAULTS[executionMode];
}

/**
 * Parse the model manifest text.
 *
 * @param read reads the manifest text; any failure is reported as unreadable
 * @returns the parsed manifest
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when the manifest cannot be read or is invalid
 */
function parseManifestText(read: () => string): PackagedModelManifest {
    let manifestJson: unknown;
    try {
        manifestJson = JSON.parse(read());
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.manifestUnreadable', { reason: errorMessage(error) }),
            { cause: error }
        );
    }
    try {
        return parsePackagedModelManifest(manifestJson);
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.manifestInvalid', { reason: errorMessage(error) }),
            { cause: error }
        );
    }
}

/**
 * Check that a resource root option is an absolute path.
 *
 * @param resourceRoot the option value
 * @throws {MockGenError} `CONFIGURATION_INVALID` otherwise
 */
function assertResourceRootOption(resourceRoot: unknown): void {
    if (resourceRoot !== undefined && (typeof resourceRoot !== 'string' || !isAbsolute(resourceRoot))) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.CONFIGURATION_INVALID, t('configuration.resourceRootInvalid'));
    }
}

/**
 * Return immutable package and model identity without allocating a native runtime.
 *
 * @param options where the resources are; the package's own `resources/` directory by default
 * @returns the model bundle identity and the required native runtime
 * @throws {MockGenError} `CONFIGURATION_INVALID` for a relative resource root, `RESOURCE_INTEGRITY` when the
 * manifest cannot be read, is invalid or lacks a classifier or SFT component
 */
export function getMockDataGeneratorInfo(options: MockDataGeneratorInfoOptions = {}): MockDataGeneratorInfo {
    assertResourceRootOption(options.resourceRoot);
    const location = resourceLocation(options.resourceRoot);
    const manifest = parseManifestText(() => readFileSync(location.manifest, 'utf8'));
    const classifier = manifest.components.find((component) => component.kind === 'classifier');
    const sft = manifest.components.find((component) => component.kind === 'sft');
    if (!classifier || !sft) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY, t('integrity.manifestComponentsMissing'));
    }
    return Object.freeze({
        apiVersion: 2 as const,
        realismReady: true as const,
        model: Object.freeze({
            bundleId: manifest.bundleId,
            revision: manifest.revision,
            classifier: classifier.fingerprint,
            sft: sft.fingerprint
        }),
        runtime: manifest.runtime
    });
}

/**
 * Classify actual learned participation without hiding a degraded classifier tier.
 *
 * @param result
 * @param mode
 */
export function actualExecutionMode(
    result: MockDataGeneratorResult,
    mode: MockDataGeneratorOptions['mode']
): StandaloneGenerationResult['executionMode'] {
    const { eligibleSlots, acceptedSlots } = result.statistics.sft;
    if (
        mode === 'deterministic' ||
        (result.capabilities.classifier !== 'ready' && result.capabilities.sft !== 'ready') ||
        (acceptedSlots === 0 && result.routing?.classifierAccepted === 0)
    ) {
        return 'deterministic';
    }
    return result.capabilities.classifier === 'ready' &&
        result.capabilities.sft === 'ready' &&
        acceptedSlots > 0 &&
        acceptedSlots === eligibleSlots
        ? 'learned'
        : 'hybrid';
}

function semanticCoverage(
    request: MockDataServiceRequest,
    result: MockDataGeneratorResult,
    parsedGraph: SchemaGraph | undefined
): StandaloneGenerationResult['semanticCoverage'] {
    const graph = parsedGraph ?? parseServiceMetadata(request.metadata, request.service);
    const targets = new Set(request.targets.map(({ name }) => name));
    let eligibleFields = 0;
    let routedFields = 0;
    let formatValidatedFields = 0;
    let structuralOnlyFields = 0;
    let evidenceVerifiedFields = 0;
    let syntheticUnverifiedFields = 0;
    const hasEvidence = (
        entity: (typeof graph.entities)[number],
        property: (typeof entity.properties)[number]
    ): boolean => {
        const rows = result.resources[entity.entitySetName] ?? [];
        if (rows.length === 0) {
            return false;
        }
        const allowed = [
            ...(property.enumValues ?? []),
            ...authoredDomainValues(graph, entity, property, request.existingData)
        ];
        return rows.every((row) => {
            const value = row[property.name];
            return allowed.some((candidate) => candidate === value);
        });
    };
    const sftFields = new Set(
        result.statistics.sft.assignments.flatMap(({ resource, fields }) =>
            fields.filter(({ acceptedSlots }) => acceptedSlots > 0).map(({ name }) => `${resource}.${name}`)
        )
    );
    // A best-effort role fills a field no role was certain for; routing counts that field as abstained, so
    // coverage does too.
    const bestEffortFields = new Set(
        result.diagnostics.filter(({ code }) => code === 'SEMANTIC_ROLE_BEST_EFFORT').map(({ target }) => target)
    );
    for (const entity of graph.entities) {
        if (!targets.has(entity.entitySetName)) {
            continue;
        }
        for (const property of entity.properties) {
            eligibleFields++;
            const evidenceVerified = hasEvidence(entity, property);
            if (evidenceVerified) {
                evidenceVerifiedFields++;
            }
            const key = `${entity.entitySetName}.${property.name}`;
            const role = bestEffortFields.has(key) ? undefined : result.semanticRoles?.[key];
            if (!role) {
                if (!evidenceVerified && sftFields.has(`${entity.entitySetName}.${property.name}`)) {
                    syntheticUnverifiedFields++;
                }
                continue;
            }
            const definition = semanticRoleDefinition(role);
            if (!definition) {
                continue;
            }
            routedFields++;
            if (!evidenceVerified) {
                syntheticUnverifiedFields++;
            }
            if (definition.validator === 'structural') {
                structuralOnlyFields++;
            } else if ((result.resources[entity.entitySetName]?.length ?? 0) > 0) {
                // validateGeneratedResult has checked every generated value against this validator.
                formatValidatedFields++;
            }
        }
    }
    return Object.freeze({
        eligibleFields,
        routedFields,
        formatValidatedFields,
        structuralOnlyFields,
        unsupportedFields: eligibleFields - routedFields,
        evidenceVerifiedFields,
        syntheticUnverifiedFields
    });
}

/**
 * Whether every published reference resolves. Generation asserts that the references it writes
 * resolve, so only references in caller-supplied rows can remain unresolved; they are published as
 * written and reported with a `SUPPLIED_REFERENCE_UNRESOLVED` diagnostic.
 *
 * @param result the generation result
 * @returns false when a supplied reference does not resolve
 */
function relationshipsResolve(result: MockDataGeneratorResult): boolean {
    return !result.diagnostics.some(({ code }) => code === 'SUPPLIED_REFERENCE_UNRESOLVED');
}

function domainMeaning(
    coverage: StandaloneGenerationResult['semanticCoverage']
): StandaloneGenerationResult['validation']['domainMeaning'] {
    if (coverage.syntheticUnverifiedFields > 0) {
        return 'synthetic-unverified';
    }
    if (coverage.unsupportedFields > 0) {
        return 'unsupported';
    }
    if (coverage.evidenceVerifiedFields > 0) {
        return 'evidence-verified';
    }
    return 'not-applicable';
}

/** A packaged resource parsed when the package loaded, with the digest of the bytes that were parsed. */
interface LoadedResource {
    id: string;
    path: string;
    sha256: string;
    /** Translation key of what the resource is, for the error messages. */
    nameKey: string;
}

/**
 * The manifest must declare a resource the package parsed at load and vouch for exactly those bytes.
 *
 * @param manifest the parsed package manifest
 * @param resource the loaded resource
 */
function assertLoadedResourceDeclared(manifest: PackagedModelManifest, resource: LoadedResource): void {
    const declared = manifest.datasets.find(({ id }) => id === resource.id);
    const name = t(resource.nameKey);
    if (declared?.path !== resource.path) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.resourceNotDeclared', { resource: name })
        );
    }
    if (declared.sha256 !== resource.sha256) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.resourceDigestMismatch', { resource: name })
        );
    }
}

/**
 * The value-bank store was parsed when the package loaded; the manifest must declare it and vouch for
 * exactly those bytes, so generation never draws from a store the manifest did not verify.
 *
 * @param manifest the parsed package manifest
 * @param loadedSha256 digest of the store bytes that were parsed
 */
export function assertValueBankStoreDeclared(
    manifest: PackagedModelManifest,
    loadedSha256: string = packagedBanks().sha256
): void {
    assertLoadedResourceDeclared(manifest, {
        id: VALUE_BANK_STORE_ID,
        path: VALUE_BANK_STORE_PATH,
        sha256: loadedSha256,
        nameKey: 'integrity.resourceName.valueBankStore'
    });
}

/**
 * The semantic rule store was parsed when the package loaded; the manifest must declare it and vouch
 * for exactly those bytes, so routing never applies rules the manifest did not verify.
 *
 * @param manifest the parsed package manifest
 * @param loadedSha256 digest of the store bytes that were parsed
 */
export function assertSemanticRuleStoreDeclared(
    manifest: PackagedModelManifest,
    loadedSha256: string = packagedSemanticRules().sha256
): void {
    assertLoadedResourceDeclared(manifest, {
        id: SEMANTIC_RULE_STORE_ID,
        path: SEMANTIC_RULE_STORE_PATH,
        sha256: loadedSha256,
        nameKey: 'integrity.resourceName.semanticRuleStore'
    });
}

/**
 * The role registry was parsed when the package loaded; the manifest must declare it and vouch for
 * exactly those bytes. Its canonical fingerprint is also pinned by the classifier head.
 *
 * @param manifest the parsed package manifest
 * @param loadedSha256 digest of the registry bytes that were parsed
 */
export function assertRoleRegistryDeclared(
    manifest: PackagedModelManifest,
    loadedSha256: string = packagedRoleRegistry().sha256
): void {
    assertLoadedResourceDeclared(manifest, {
        id: ROLE_REGISTRY_ID,
        path: ROLE_REGISTRY_PATH,
        sha256: loadedSha256,
        nameKey: 'integrity.resourceName.roleRegistry'
    });
}

interface LoadedSessionRuntime {
    runtime: LearnedRuntimeHandle['runtime'];
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
}

/**
 * A learned component that could not load leaves generation on the lower tiers; that is a warning,
 * not an error, so validation of the generated data is unaffected. The installation path is not disclosed.
 *
 * @param diagnostic diagnostic recorded while loading the learned runtime
 * @param location where the session reads the resources from
 * @returns the diagnostic as reported to callers
 */
function runtimeDiagnostic(
    diagnostic: LearnedRuntimeDiagnostic,
    location: ResourceLocation
): MockDataGeneratorDiagnostic {
    // Native loader errors often embed absolute paths; report them relative to the package or resource root.
    const installation = packageDirectory();
    const resourcesRedacted = diagnostic.cause?.replaceAll(location.root, '<mock-data-generator-resources>');
    const cause =
        installation === undefined
            ? resourcesRedacted
            : resourcesRedacted?.replaceAll(installation, '<mock-data-generator>');
    return Object.freeze({
        code: diagnostic.code,
        severity: 'warning' as const,
        message: cause === undefined ? diagnostic.message : `${diagnostic.message} Cause: ${cause}`
    });
}

// Packaged artifacts are immutable for a given manifest revision, so they are hashed once per process.
const verifiedArtifacts = new Map<string, Promise<VerifiedModelArtifacts>>();

/**
 * Hash every packaged model artifact and check the classifier head contract.
 *
 * @param manifest the parsed package manifest
 * @param location where the session reads the resources from
 * @returns the verified artifact locations
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when an artifact is missing or corrupt or the classifier head is invalid
 */
async function verifyModelArtifacts(
    manifest: PackagedModelManifest,
    location: ResourceLocation
): Promise<VerifiedModelArtifacts> {
    let verification: Awaited<ReturnType<typeof verifyPackagedModels>>;
    try {
        verification = await verifyPackagedModels(location.models, manifest);
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.modelArtifactsUnverifiable', { reason: errorMessage(error) }),
            { cause: error }
        );
    }
    if (!verification.ready) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.modelArtifactsCorrupt', {
                failures: verification.failures
                    .map(({ componentId, role, reason }) => `${componentId}/${role}:${reason}`)
                    .join(', ')
            })
        );
    }
    const classifierComponent = manifest.components.find(({ kind }) => kind === 'classifier');
    const classifierHeadPath =
        classifierComponent && verification.files.get(classifierComponent.id)?.get('classifier-head');
    if (!classifierComponent || !classifierHeadPath) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY, t('integrity.classifierHeadMissing'));
    }
    try {
        const classifierHead: unknown = JSON.parse(await readFile(classifierHeadPath, 'utf8'));
        assertPackagedClassifierHead(classifierHead, classifierComponent.contract.inputFormat);
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.classifierHeadInvalid', { reason: errorMessage(error) }),
            { cause: error }
        );
    }
    return Object.freeze({ ready: true, files: verification.files, failures: Object.freeze([]) });
}

/**
 * Hash and check the packaged model artifacts the first time a learned runtime is needed in this process.
 * A failed verification is not cached, so a repaired installation is picked up by the next request.
 *
 * @param manifest the parsed package manifest
 * @param location where the session reads the resources from
 * @returns the verified artifact locations
 */
function verifiedModelArtifacts(
    manifest: PackagedModelManifest,
    location: ResourceLocation
): Promise<VerifiedModelArtifacts> {
    const key = `${location.models}|${manifest.revision}`;
    let verification = verifiedArtifacts.get(key);
    if (verification === undefined) {
        verification = verifyModelArtifacts(manifest, location);
        verifiedArtifacts.set(key, verification);
        verification.catch(() => verifiedArtifacts.delete(key));
    }
    return verification;
}

/** The learned runtime of one generation session: loaded when a request first needs it, released on dispose. */
interface SessionRuntime {
    /** Throws when the session has been disposed. */
    assertActive(): void;
    /** The runtime for a request of the given mode, with the diagnostics of loading it. */
    load(mode: MockDataGeneratorOptions['mode']): Promise<LoadedSessionRuntime>;
    /** The diagnostics of a load plus those of the answer cache, reported with every result. */
    sessionDiagnostics(loaded: LoadedSessionRuntime): MockDataGeneratorDiagnostic[];
    /** Release the runtime, including one still loading; later calls do nothing. */
    dispose(): Promise<void>;
}

/**
 * Reject creation options that are not supported.
 *
 * @param options the creation options
 * @throws {MockGenError} `CONFIGURATION_INVALID` for an unknown execution mode, or a relative answer cache
 * directory or resource root
 */
function assertCreateOptions(options: CreateMockDataGeneratorOptions): void {
    if (options.executionMode !== undefined && !['api', 'data-editor', 'start-mock'].includes(options.executionMode)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.CONFIGURATION_INVALID, t('configuration.executionModeUnsupported'));
    }
    if (
        options.answerCacheDirectory !== undefined &&
        (typeof options.answerCacheDirectory !== 'string' || !isAbsolute(options.answerCacheDirectory))
    ) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.CONFIGURATION_INVALID,
            t('configuration.answerCacheDirectoryRelative')
        );
    }
    assertResourceRootOption(options.resourceRoot);
}

/**
 * A session on another resource root than the one the domain resources were loaded from is accepted only
 * when that root's manifest declares the same value banks, semantic rules and role registry: one process
 * uses one set of them.
 *
 * @param manifest the manifest below the session's root, whose datasets were verified against their files
 * @param root the session's resource root
 * @param domainRoot the root the domain resources are read from
 * @throws {MockGenError} `CONFIGURATION_INVALID` when a domain resource differs from the loaded one
 */
function assertSameDomainResources(manifest: PackagedModelManifest, root: string, domainRoot: string): void {
    const loaded = [
        { id: VALUE_BANK_STORE_ID, nameKey: 'integrity.resourceName.valueBankStore', digest: packagedBanks },
        {
            id: SEMANTIC_RULE_STORE_ID,
            nameKey: 'integrity.resourceName.semanticRuleStore',
            digest: packagedSemanticRules
        },
        { id: ROLE_REGISTRY_ID, nameKey: 'integrity.resourceName.roleRegistry', digest: packagedRoleRegistry }
    ];
    for (const { id, nameKey, digest } of loaded) {
        if (manifest.datasets.find((dataset) => dataset.id === id)?.sha256 !== digest().sha256) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.CONFIGURATION_INVALID,
                t('configuration.domainResourcesDiffer', { resource: t(nameKey), root, loadedRoot: domainRoot })
            );
        }
    }
}

/**
 * Read the manifest below a session's resource root, verify every declared dataset file below that root
 * against it, and check that it declares the loaded value-bank store, rule store and role registry. The
 * first session fixes the root the domain resources are read from (see {@link claimDomainResourceRoot}),
 * so their files are verified before they are parsed.
 *
 * @param location where the session reads the resources from
 * @returns the verified manifest
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when the manifest is unreadable or invalid, a dataset is corrupt,
 * or the manifest does not declare the loaded resources; `CONFIGURATION_INVALID` when the root holds other
 * domain resources than the ones this process loaded
 */
async function readVerifiedManifest(location: ResourceLocation): Promise<PackagedModelManifest> {
    const manifestText = await readFile(location.manifest, 'utf8').catch((error: unknown) => error);
    const manifest = parseManifestText(() => {
        if (typeof manifestText !== 'string') {
            throw manifestText;
        }
        return manifestText;
    });
    const domainRoot = claimDomainResourceRoot(location.root);
    let datasetFailures: Awaited<ReturnType<typeof verifyDatasetsBelowResourceRoot>>;
    try {
        datasetFailures = await verifyDatasetsBelowResourceRoot(location.root, manifest);
    } catch (error) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.datasetsCorrupt', { datasets: errorMessage(error) }),
            { cause: error }
        );
    }
    if (datasetFailures.length > 0) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY,
            t('integrity.datasetsCorrupt', { datasets: datasetFailures.map(({ id }) => id).join(', ') })
        );
    }
    if (domainRoot !== location.root) {
        assertSameDomainResources(manifest, location.root, domainRoot);
    }
    assertValueBankStoreDeclared(manifest);
    assertSemanticRuleStoreDeclared(manifest);
    assertRoleRegistryDeclared(manifest);
    return manifest;
}

/**
 * Create the learned-runtime holder of one session. The installed onnxruntime-node version is checked when a
 * model first loads (createLearnedRuntime), so a deterministic session does not depend on the native package.
 *
 * @param manifest the verified package manifest
 * @param options the creation options
 * @param location where the session reads the resources from
 * @returns the session's runtime holder
 */
function createSessionRuntime(
    manifest: PackagedModelManifest,
    options: CreateMockDataGeneratorOptions,
    location: ResourceLocation
): SessionRuntime {
    let learnedLoad: Promise<LearnedRuntimeHandle> | undefined;
    let answerStore: FileCompletionStore | undefined;
    let disposed = false;
    function assertActive(): void {
        if (disposed) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.SESSION_DISPOSED, t('configuration.sessionDisposed'));
        }
    }
    /**
     * Load the learned runtime at most once per session; concurrent callers share the same pending load.
     *
     * @param mode generation mode of the request
     * @returns the runtime and the diagnostics of loading it (none in deterministic mode)
     */
    async function load(mode: MockDataGeneratorOptions['mode']): Promise<LoadedSessionRuntime> {
        if (mode === 'deterministic') {
            return { runtime: {}, diagnostics: [] };
        }
        if (options.answerCacheDirectory !== undefined) {
            answerStore ??= openFileCompletionStore({
                directory: options.answerCacheDirectory,
                namespace: manifest.revision
            });
        }
        const completionStore = answerStore;
        const pendingLoad = (learnedLoad ??= verifiedModelArtifacts(manifest, location).then((cache) =>
            createLearnedRuntime(manifest, cache, undefined, completionStore ? { completionStore } : {})
        ));
        // A failed load is not kept, so the next request retries it instead of failing for the session's lifetime.
        pendingLoad.catch(() => {
            if (learnedLoad === pendingLoad) {
                learnedLoad = undefined;
            }
        });
        const learned = await pendingLoad;
        // dispose() may have run while the load was pending; it releases the runtime, the request stops here.
        assertActive();
        return {
            runtime: learned.runtime,
            diagnostics: learned.diagnostics.map((diagnostic) => runtimeDiagnostic(diagnostic, location))
        };
    }
    /**
     * A cache that cannot be read or written only costs time; say so instead of failing.
     *
     * @returns the answer-cache diagnostic, when the cache failed
     */
    function answerCacheDiagnostics(): ReadonlyArray<MockDataGeneratorDiagnostic> {
        const cacheFailure = answerStore?.failure;
        return cacheFailure === undefined
            ? []
            : [
                  Object.freeze({
                      code: 'SFT_ANSWER_CACHE_UNAVAILABLE',
                      severity: 'info' as const,
                      message: `Model answers are kept in memory only: ${cacheFailure}`
                  })
              ];
    }
    return {
        assertActive,
        load,
        sessionDiagnostics: (loaded) => [...loaded.diagnostics, ...answerCacheDiagnostics()],
        dispose: async (): Promise<void> => {
            if (!disposed) {
                disposed = true;
                // A load still in flight is awaited so the runtime it produces is released, not leaked.
                const pending = await Promise.allSettled([learnedLoad]);
                const [settled] = pending;
                if (settled.status === 'fulfilled') {
                    await settled.value?.dispose();
                }
            }
        }
    };
}

/**
 * Generate one service in a session and report how the result was produced and validated.
 *
 * @param session the session's runtime holder
 * @param manifest the verified package manifest
 * @param options the creation options
 * @param request the service to generate
 * @param generationOptions generation options; they win over the execution mode's defaults
 * @returns the result with its execution mode, validation and semantic coverage
 */
async function generateSessionService(
    session: SessionRuntime,
    manifest: PackagedModelManifest,
    options: CreateMockDataGeneratorOptions,
    request: MockDataServiceRequest,
    generationOptions: StandaloneGenerationOptions
): Promise<StandaloneGenerationResult> {
    session.assertActive();
    request.signal?.throwIfAborted();
    const mode = generationOptions.mode ?? 'auto';
    const effectiveOptions = { ...executionModeDefaults(options.executionMode), ...generationOptions };
    const loaded = await session.load(mode);
    const { result, parsedGraph } = await generateServiceWithSchema(request, effectiveOptions, {
        ...loaded.runtime,
        ...(options.onProgress ? { onProgress: options.onProgress } : {})
    });
    const formats = !result.diagnostics.some(({ severity }) => severity === 'error');
    const coverage = semanticCoverage(request, result, parsedGraph);
    const sessionDiagnostics = session.sessionDiagnostics(loaded);
    return Object.freeze({
        ...result,
        ...(sessionDiagnostics.length === 0
            ? {}
            : { diagnostics: Object.freeze([...result.diagnostics, ...sessionDiagnostics]) }),
        executionMode: actualExecutionMode(result, mode),
        validation: Object.freeze({
            passed: formats,
            formats,
            relationships: relationshipsResolve(result),
            domainMeaning: domainMeaning(coverage)
        }),
        semanticCoverage: coverage,
        modelRevision: manifest.revision
    });
}

/**
 * Inspect one service generation in a session.
 *
 * @param session the session's runtime holder
 * @param options the creation options
 * @param request the service to generate
 * @param generationOptions generation options; they win over the execution mode's defaults
 * @param inspectionOptions what the report includes
 * @returns the inspection report with the session's diagnostics
 */
async function inspectSessionService(
    session: SessionRuntime,
    options: CreateMockDataGeneratorOptions,
    request: MockDataServiceRequest,
    generationOptions: StandaloneGenerationOptions,
    inspectionOptions: MockDataGeneratorInspectionOptions
): Promise<MockDataGeneratorInspectionV1> {
    session.assertActive();
    const loaded = await session.load(generationOptions.mode ?? 'auto');
    const inspection = await inspectService(
        request,
        { ...executionModeDefaults(options.executionMode), ...generationOptions },
        {
            ...loaded.runtime,
            ...(options.onProgress ? { onProgress: options.onProgress } : {})
        },
        inspectionOptions
    );
    const sessionDiagnostics = session.sessionDiagnostics(loaded);
    return sessionDiagnostics.length === 0
        ? inspection
        : Object.freeze({
              ...inspection,
              diagnostics: Object.freeze([...inspection.diagnostics, ...sessionDiagnostics])
          });
}

/**
 * Verify the package manifest and value-bank store and create one reusable generation session.
 * Model artifacts are verified when a request first needs the learned runtime, never in deterministic mode.
 *
 * @param options how the session runs: execution mode, progress observer, answer cache and resource root
 * @returns the generation session
 * @throws {MockGenError} `CONFIGURATION_INVALID` for invalid options, `RESOURCE_INTEGRITY` when the manifest or
 * a shipped data resource is missing, invalid or does not match
 * @example
 * const generator = await createMockDataGenerator({ executionMode: 'data-editor' });
 * try {
 *     const result = await generator.generateService(request, { seed: 1 });
 * } finally {
 *     await generator.dispose();
 * }
 */
export async function createMockDataGenerator(
    options: CreateMockDataGeneratorOptions = {}
): Promise<MockDataGenerator> {
    assertCreateOptions(options);
    const location = resourceLocation(options.resourceRoot);
    const manifest = await readVerifiedManifest(location);
    const session = createSessionRuntime(manifest, options, location);
    return Object.freeze({
        generateService: async (
            request: MockDataServiceRequest,
            generationOptions: StandaloneGenerationOptions = {}
        ): Promise<StandaloneGenerationResult> =>
            generateSessionService(session, manifest, options, request, generationOptions),
        inspectService: async (
            request: MockDataServiceRequest,
            generationOptions: StandaloneGenerationOptions = {},
            inspectionOptions: MockDataGeneratorInspectionOptions = {}
        ): Promise<MockDataGeneratorInspectionV1> =>
            inspectSessionService(session, options, request, generationOptions, inspectionOptions),
        dispose: (): Promise<void> => session.dispose()
    });
}
