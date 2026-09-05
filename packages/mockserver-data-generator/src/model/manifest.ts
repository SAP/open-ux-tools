export type ModelComponentKind = 'classifier' | 'sft';
export type ModelLifecycle = 'development' | 'preview' | 'stable';
export type ModelOutputFormat = 'embedding-classifier-v2' | 'row-object-v1';
export type ModelRuntimePlatform = 'darwin' | 'linux' | 'win32';
export type ModelRuntimeArchitecture = 'arm64' | 'x64';

export interface ModelArtifactFile {
    role: string;
    path: string;
    bytes: number;
    sha256: string;
    url: string;
}

export interface ModelRuntimeContract {
    backend: 'onnx';
    package: 'onnxruntime-node' | 'onnxruntime-web';
    version: string;
    inputs: ReadonlyArray<string>;
    outputs: ReadonlyArray<string>;
    outputFormat: ModelOutputFormat;
}

export interface ModelComponentManifest {
    id: string;
    kind: ModelComponentKind;
    version: string;
    fingerprint: string;
    files: ReadonlyArray<ModelArtifactFile>;
    runtime: ModelRuntimeContract;
    license: Readonly<{ name: string; url: string }>;
    modelCardUrl: string;
}

export interface ModelRuntimeArtifact {
    id: string;
    package: 'onnxruntime-node';
    version: string;
    platform: ModelRuntimePlatform;
    architecture: ModelRuntimeArchitecture;
    fingerprint: string;
    entry: string;
    files: ReadonlyArray<ModelArtifactFile>;
    license: Readonly<{ name: string; url: string }>;
    sourceUrl: string;
    sbomUrl: string;
}

export interface ModelManifest {
    formatVersion: 1 | 2;
    bundleId: string;
    revision: string;
    lifecycle: ModelLifecycle;
    components: ReadonlyArray<ModelComponentManifest>;
    runtimes: ReadonlyArray<ModelRuntimeArtifact>;
}

type UnknownRecord = Record<string, unknown>;
const MAX_DISTRIBUTED_MODEL_BUNDLE_BYTES = 200 * 1024 * 1024;
const MAX_PLATFORM_RUNTIME_BYTES = 64 * 1024 * 1024;

function record(value: unknown, label: string): UnknownRecord {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} must be an object`);
    }
    return value as UnknownRecord;
}

function string(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function identifier(value: unknown, label: string): string {
    const result = string(value, label);
    if (result.length > 100 || !/^[a-z0-9][a-z0-9._-]*$/i.test(result)) {
        throw new TypeError(`${label} contains unsupported characters`);
    }
    return result;
}

function url(value: unknown, label: string): string {
    const result = string(value, label);
    let parsed: URL;
    try {
        parsed = new URL(result);
    } catch {
        throw new TypeError(`${label} must be an absolute HTTPS URL`);
    }
    const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !localHttp) {
        throw new TypeError(`${label} must use HTTPS`);
    }
    return result;
}

function oneOf<T extends string>(value: unknown, values: ReadonlyArray<T>, label: string): T {
    if (typeof value !== 'string' || !values.includes(value as T)) {
        throw new TypeError(`${label} must be one of ${values.join(', ')}`);
    }
    return value as T;
}

function hash(value: unknown, label: string): string {
    const result = string(value, label);
    if (!/^[a-f\d]{64}$/.test(result)) {
        throw new TypeError(`${label} must be a lowercase SHA-256`);
    }
    return result;
}

function immutableRevision(value: unknown): string {
    const result = string(value, 'model manifest revision');
    if (!/^[a-f\d]{40,64}$/.test(result)) {
        throw new TypeError('model manifest revision must be an immutable commit or content hash');
    }
    return result;
}

function relativeArtifactPath(value: unknown): string {
    const result = string(value, 'model artifact path');
    if (
        result.startsWith('/') ||
        result.startsWith('\\') ||
        /^[A-Za-z]:/.test(result) ||
        result.includes('\\') ||
        result.split('/').some((part) => part === '' || part === '.' || part === '..')
    ) {
        throw new TypeError('model artifact path must be a normalized relative path');
    }
    return result;
}

function stringArray(value: unknown, label: string): ReadonlyArray<string> {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty array`);
    }
    const result = value.map((entry, index) => string(entry, `${label}[${index}]`));
    if (new Set(result).size !== result.length) {
        throw new TypeError(`${label} contains duplicates`);
    }
    return Object.freeze(result);
}

function exactRuntimeVersion(value: unknown): string {
    const result = string(value, 'model runtime version');
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(result)) {
        throw new TypeError('model runtime version must be an exact semantic version');
    }
    return result;
}

function artifactFile(value: unknown): ModelArtifactFile {
    const input = record(value, 'model artifact file');
    const bytes = input.bytes;
    if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes <= 0) {
        throw new TypeError('model artifact bytes must be a positive safe integer');
    }
    return Object.freeze({
        role: string(input.role, 'model artifact role'),
        path: relativeArtifactPath(input.path),
        bytes,
        sha256: hash(input.sha256, 'model artifact checksum'),
        url: url(input.url, 'model artifact URL')
    });
}

function component(value: unknown): ModelComponentManifest {
    const input = record(value, 'model component');
    const kind = oneOf(input.kind, ['classifier', 'sft'] as const, 'model component kind');
    const files = Array.isArray(input.files) ? input.files.map(artifactFile) : [];
    if (files.length === 0) {
        throw new TypeError('model component files must be a non-empty array');
    }
    const runtime = record(input.runtime, 'model runtime');
    const expectedOutputFormat: ModelOutputFormat = kind === 'classifier' ? 'embedding-classifier-v2' : 'row-object-v1';
    const outputFormat = oneOf(
        runtime.outputFormat,
        ['embedding-classifier-v2', 'row-object-v1'] as const,
        'model runtime output format'
    );
    if (outputFormat !== expectedOutputFormat) {
        throw new TypeError(`model runtime output format ${outputFormat} is not valid for ${kind}`);
    }
    const license = record(input.license, 'model license');
    return Object.freeze({
        id: identifier(input.id, 'model component id'),
        kind,
        version: string(input.version, 'model component version'),
        fingerprint: hash(input.fingerprint, 'model component fingerprint'),
        files: Object.freeze(files),
        runtime: Object.freeze({
            backend: oneOf(runtime.backend, ['onnx'] as const, 'model runtime backend'),
            package: oneOf(runtime.package, ['onnxruntime-node', 'onnxruntime-web'] as const, 'model runtime package'),
            version: exactRuntimeVersion(runtime.version),
            inputs: stringArray(runtime.inputs, 'model runtime inputs'),
            outputs: stringArray(runtime.outputs, 'model runtime outputs'),
            outputFormat
        }),
        license: Object.freeze({
            name: string(license.name, 'model license name'),
            url: url(license.url, 'model license URL')
        }),
        modelCardUrl: url(input.modelCardUrl, 'model card URL')
    });
}

function runtimeArtifact(value: unknown): ModelRuntimeArtifact {
    const input = record(value, 'platform runtime');
    const files = Array.isArray(input.files) ? input.files.map(artifactFile) : [];
    if (files.length === 0) {
        throw new TypeError('platform runtime files must be a non-empty array');
    }
    const fileRoles = files.map(({ role }) => role);
    if (new Set(fileRoles).size !== fileRoles.length) {
        throw new TypeError('platform runtime contains a duplicate file role');
    }
    const entry = relativeArtifactPath(input.entry);
    if (!files.some((file) => file.role === 'entry' && file.path === entry)) {
        throw new TypeError('platform runtime entry must identify its declared entry file');
    }
    if (files.reduce((total, file) => total + file.bytes, 0) > MAX_PLATFORM_RUNTIME_BYTES) {
        throw new TypeError('each platform runtime must not exceed 64 MiB');
    }
    const license = record(input.license, 'platform runtime license');
    return Object.freeze({
        id: identifier(input.id, 'platform runtime id'),
        package: oneOf(input.package, ['onnxruntime-node'] as const, 'platform runtime package'),
        version: exactRuntimeVersion(input.version),
        platform: oneOf(input.platform, ['darwin', 'linux', 'win32'] as const, 'platform runtime platform'),
        architecture: oneOf(input.architecture, ['arm64', 'x64'] as const, 'platform runtime architecture'),
        fingerprint: hash(input.fingerprint, 'platform runtime fingerprint'),
        entry,
        files: Object.freeze(files),
        license: Object.freeze({
            name: string(license.name, 'platform runtime license name'),
            url: url(license.url, 'platform runtime license URL')
        }),
        sourceUrl: url(input.sourceUrl, 'platform runtime source URL'),
        sbomUrl: url(input.sbomUrl, 'platform runtime SBOM URL')
    });
}

/**
 * Validate and freeze an untrusted model-distribution manifest.
 *
 * @param value
 */
export function parseModelManifest(value: unknown): ModelManifest {
    const input = record(value, 'model manifest');
    if (input.formatVersion !== 1 && input.formatVersion !== 2) {
        throw new TypeError('model manifest formatVersion must be 1 or 2');
    }
    if (!Array.isArray(input.components) || input.components.length === 0) {
        throw new TypeError('model manifest components must be a non-empty array');
    }
    const components = input.components.map(component);
    let runtimes: ModelRuntimeArtifact[] = [];
    if (input.formatVersion === 1) {
        if (input.runtimes !== undefined && (!Array.isArray(input.runtimes) || input.runtimes.length > 0)) {
            throw new TypeError('platform runtimes require model manifest formatVersion 2');
        }
    } else {
        if (!Array.isArray(input.runtimes) || input.runtimes.length === 0) {
            throw new TypeError('model manifest formatVersion 2 requires platform runtimes');
        }
        runtimes = input.runtimes.map(runtimeArtifact);
        const runtimeContracts = new Set(components.map(({ runtime }) => `${runtime.package}\u0000${runtime.version}`));
        if (runtimeContracts.size !== 1) {
            throw new TypeError('formatVersion 2 model components must share one native runtime contract');
        }
        const [componentRuntime] = runtimeContracts;
        if (runtimes.some((runtime) => `${runtime.package}\u0000${runtime.version}` !== componentRuntime)) {
            throw new TypeError('platform runtime does not match the model component runtime contract');
        }
        const runtimeIds = runtimes.map(({ id }) => id);
        if (new Set(runtimeIds).size !== runtimeIds.length) {
            throw new TypeError('model manifest contains a duplicate platform runtime ID');
        }
        const runtimeTargets = runtimes.map(({ platform, architecture }) => `${platform}-${architecture}`);
        if (new Set(runtimeTargets).size !== runtimeTargets.length) {
            throw new TypeError('model manifest contains a duplicate platform runtime target');
        }
    }
    const componentIds = components.map(({ id }) => id);
    if (new Set(componentIds).size !== componentIds.length) {
        throw new TypeError('model manifest contains a duplicate component ID');
    }
    const componentKinds = components.map(({ kind }) => kind);
    if (new Set(componentKinds).size !== componentKinds.length) {
        throw new TypeError('model manifest contains a duplicate component kind');
    }
    const filePaths = [
        ...components.flatMap(({ files }) => files.map(({ path }) => path)),
        ...runtimes.flatMap(({ files }) => files.map(({ path }) => path))
    ];
    if (new Set(filePaths).size !== filePaths.length) {
        throw new TypeError('model manifest contains a duplicate file path');
    }
    const lifecycle = oneOf(input.lifecycle, ['development', 'preview', 'stable'] as const, 'model lifecycle');
    if (lifecycle !== 'development') {
        let bundleBytes = 0;
        for (const { files } of components) {
            for (const { bytes } of files) {
                bundleBytes += bytes;
                if (bundleBytes > MAX_DISTRIBUTED_MODEL_BUNDLE_BYTES) {
                    throw new TypeError('preview and stable model bundles must not exceed 200 MiB');
                }
            }
        }
    }
    return Object.freeze({
        formatVersion: input.formatVersion,
        bundleId: identifier(input.bundleId, 'model manifest bundleId'),
        revision: immutableRevision(input.revision),
        lifecycle,
        components: Object.freeze(components),
        runtimes: Object.freeze(runtimes)
    });
}

/**
 * Select the one immutable native runtime eligible for this Node platform.
 * Development format 1 manifests retain the explicit locally installed runtime
 * path used by the unpublished test kit.
 *
 * @param manifest parsed model manifest
 * @param platform Node operating-system identifier
 * @param architecture Node CPU architecture identifier
 * @returns selected release runtime, or undefined for a development manifest
 */
export function selectPlatformRuntime(
    manifest: ModelManifest,
    platform: string = process.platform,
    architecture: string = process.arch
): ModelRuntimeArtifact | undefined {
    if (manifest.formatVersion === 1) {
        return undefined;
    }
    const runtime = manifest.runtimes.find(
        (candidate) => candidate.platform === platform && candidate.architecture === architecture
    );
    if (!runtime) {
        throw new Error(`No native MockGen runtime is available for ${platform}-${architecture}`);
    }
    return runtime;
}
