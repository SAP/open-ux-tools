export type ModelComponentKind = 'classifier' | 'sft';
export type ModelLifecycle = 'development' | 'preview' | 'stable';
export type ModelOutputFormat = 'embedding-classifier-v2' | 'row-object-v1';

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

export interface ModelManifest {
    formatVersion: 1;
    bundleId: string;
    revision: string;
    lifecycle: ModelLifecycle;
    components: ReadonlyArray<ModelComponentManifest>;
}

type UnknownRecord = Record<string, unknown>;

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

/**
 * Validate and freeze an untrusted model-distribution manifest.
 *
 * @param value
 */
export function parseModelManifest(value: unknown): ModelManifest {
    const input = record(value, 'model manifest');
    if (input.formatVersion !== 1) {
        throw new TypeError('model manifest formatVersion must be 1');
    }
    if (!Array.isArray(input.components) || input.components.length === 0) {
        throw new TypeError('model manifest components must be a non-empty array');
    }
    const components = input.components.map(component);
    const componentIds = components.map(({ id }) => id);
    if (new Set(componentIds).size !== componentIds.length) {
        throw new TypeError('model manifest contains a duplicate component ID');
    }
    const componentKinds = components.map(({ kind }) => kind);
    if (new Set(componentKinds).size !== componentKinds.length) {
        throw new TypeError('model manifest contains a duplicate component kind');
    }
    const filePaths = components.flatMap(({ files }) => files.map(({ path }) => path));
    if (new Set(filePaths).size !== filePaths.length) {
        throw new TypeError('model manifest contains a duplicate file path');
    }
    return Object.freeze({
        formatVersion: 1,
        bundleId: identifier(input.bundleId, 'model manifest bundleId'),
        revision: immutableRevision(input.revision),
        lifecycle: oneOf(input.lifecycle, ['development', 'preview', 'stable'] as const, 'model lifecycle'),
        components: Object.freeze(components)
    });
}
