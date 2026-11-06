import { isRecord } from '../guards.js';

/** Element types of the tensors the packaged models exchange with the native runtime. */
export type OnnxTensorType = 'int64' | 'float32';

/** A tensor as the native runtime returns it: flat data and its dimensions. */
export interface OnnxTensorLike {
    data: BigInt64Array | Float32Array;
    dims: ReadonlyArray<number>;
}

/** One loaded model graph. */
export interface OnnxSessionLike {
    run(feeds: Readonly<Record<string, OnnxTensorLike>>): Promise<Readonly<Record<string, OnnxTensorLike>>>;
    dispose?(): Promise<void> | void;
}

/** The part of the native ONNX runtime the packaged models use: loading a graph and building input tensors. */
export interface OnnxBackend {
    createSession(modelPath: string): Promise<OnnxSessionLike>;
    tensor(type: OnnxTensorType, data: BigInt64Array | Float32Array, dimensions: ReadonlyArray<number>): OnnxTensorLike;
}

/** How one model kind opens its sessions. */
export interface OnnxBackendProfile {
    /** Native session options for `InferenceSession.create`, built when each session is created. */
    sessionOptions(): Readonly<Record<string, unknown>>;
    /** What the module must expose, named in the error when it does not, e.g. `ONNX runtime API`. */
    requiredApi: string;
}

interface NativeOnnxSession {
    run(feeds: Readonly<Record<string, OnnxTensorLike>>): Promise<Readonly<Record<string, OnnxTensorLike>>>;
    release(): Promise<void> | void;
}

interface NativeOnnxApi {
    InferenceSession: { create(modelPath: string, options?: object): Promise<NativeOnnxSession> };
    Tensor: new (
        type: OnnxTensorType,
        data: BigInt64Array | Float32Array,
        dimensions: ReadonlyArray<number>
    ) => OnnxTensorLike;
}

/**
 * Find the runtime API on an imported module: on the module itself, or on its `default` export when the
 * module is loaded through CommonJS interop.
 *
 * @param module imported runtime module
 * @returns the API, or undefined when the module does not expose a session factory and a tensor class
 */
function nativeOnnxApi(module: unknown): NativeOnnxApi | undefined {
    const imported = isRecord(module) ? module : {};
    const runtime = imported.InferenceSession || imported.Tensor ? imported : imported.default;
    if (!isRecord(runtime)) {
        return undefined;
    }
    const { InferenceSession, Tensor } = runtime;
    // `InferenceSession` is a class in the native module, so a function as well as an object qualifies.
    const factory: unknown =
        (typeof InferenceSession === 'function' || isRecord(InferenceSession)) && 'create' in InferenceSession
            ? InferenceSession.create
            : undefined;
    if (typeof factory !== 'function' || typeof Tensor !== 'function') {
        return undefined;
    }
    // The native module is untyped; the session factory and tensor constructor were checked above.
    return { InferenceSession, Tensor } as unknown as NativeOnnxApi;
}

/**
 * Adapt an already integrity-verified ONNX runtime module to the backend the model runtimes use. Every
 * session runs on the CPU provider; the profile adds the options of one model kind.
 *
 * @param module imported runtime module
 * @param label privacy-safe source label for diagnostics
 * @param profile session options and the API name for the error message
 * @returns the backend
 * @throws {TypeError} when the module does not expose `InferenceSession.create` and `Tensor`
 * @example
 * const backend = createOnnxRuntimeBackend(await import('onnxruntime-node'), 'native runtime', {
 *     sessionOptions: () => ({ executionProviders: ['cpu'] }),
 *     requiredApi: 'ONNX runtime API'
 * });
 */
export function createOnnxRuntimeBackend(module: unknown, label: string, profile: OnnxBackendProfile): OnnxBackend {
    const api = nativeOnnxApi(module);
    if (!api) {
        throw new TypeError(`${label} does not expose the required ${profile.requiredApi}`);
    }
    const { InferenceSession, Tensor } = api;
    return Object.freeze({
        createSession: async (modelPath: string) => {
            const session = await InferenceSession.create(modelPath, profile.sessionOptions());
            return Object.freeze({
                run: (feeds: Readonly<Record<string, OnnxTensorLike>>) => session.run(feeds),
                dispose: () => session.release()
            });
        },
        tensor: (type: OnnxTensorType, data: BigInt64Array | Float32Array, dimensions: ReadonlyArray<number>) =>
            new Tensor(type, data, dimensions)
    });
}
