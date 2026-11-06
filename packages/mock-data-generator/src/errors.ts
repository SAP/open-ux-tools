/**
 * Coded errors of the package.
 *
 * Rule for which error a failure raises:
 * - {@link MockGenError} is raised for every runtime condition a caller or user can act on: an invalid
 *   request, request document or generation option ({@link MOCKGEN_ERROR_CODE.REQUEST_INVALID}),
 *   service metadata that cannot be read, a CLI usage error, unsupported creation options, an
 *   unreadable file, an unsafe or concurrently changed project data directory, a held project lock, a
 *   project transaction that needs manual recovery, and every integrity failure of the shipped
 *   resources and models (missing, corrupt, undeclared or not matching the manifest digest). Its `code`
 *   is stable and part of the public API; its `message` is for people and may be translated.
 * - `TypeError` stays for contract violations inside the package: the strict parsers of the shipped
 *   resources (wrapped into a {@link MOCKGEN_ERROR_CODE.RESOURCE_INTEGRITY} MockGenError where the
 *   package loads them), the internal learned-runtime component contracts (reported as warning
 *   diagnostics, never thrown to callers), and the self-checks of a generated result, which indicate
 *   a defect of the generator rather than a condition the caller can correct.
 *
 * Generation diagnostics are not errors: they carry a {@link MockDataGeneratorDiagnosticCode} and an
 * English technical message, and are reported in the result.
 */

/** Stable codes of {@link MockGenError}. */
export const MOCKGEN_ERROR_CODE = {
    /** The request, the request document or a generation option is invalid. */
    REQUEST_INVALID: 'REQUEST_INVALID',
    /** The service metadata cannot be read as EDMX or CSN, or does not describe the requested service. */
    METADATA_INVALID: 'METADATA_INVALID',
    /** The service metadata exceeds the accepted input size. */
    METADATA_INPUT_TOO_LARGE: 'METADATA_INPUT_TOO_LARGE',
    /** The generated result exceeds the size a mock server can publish. */
    GENERATED_RESULT_TOO_LARGE: 'GENERATED_RESULT_TOO_LARGE',
    /** The options of `createMockDataGenerator` are invalid. */
    CONFIGURATION_INVALID: 'CONFIGURATION_INVALID',
    /** The command line does not match the CLI usage. */
    CLI_USAGE: 'CLI_USAGE',
    /** A file the caller named cannot be read or parsed. */
    FILE_UNREADABLE: 'FILE_UNREADABLE',
    /** A shipped resource or model is missing, corrupt, undeclared or does not match the manifest. */
    RESOURCE_INTEGRITY: 'RESOURCE_INTEGRITY',
    /** The generator session was used after `dispose()`. */
    SESSION_DISPOSED: 'SESSION_DISPOSED',
    /** The project data directory is not a safe application-relative location. */
    PROJECT_PATH_UNSAFE: 'PROJECT_PATH_UNSAFE',
    /** Another run holds the project lock beyond the wait time. */
    PROJECT_LOCKED: 'PROJECT_LOCKED',
    /** The project data changed while it was being generated or recovered. */
    PROJECT_DATA_CHANGED: 'PROJECT_DATA_CHANGED',
    /** An interrupted project transaction must be recovered by hand. */
    PROJECT_RECOVERY_REQUIRED: 'PROJECT_RECOVERY_REQUIRED',
    /** Generated project data failed validation and was not written. */
    PROJECT_DATA_REJECTED: 'PROJECT_DATA_REJECTED'
} as const;

/** A stable code of {@link MockGenError}. */
export type MockGenErrorCode = (typeof MOCKGEN_ERROR_CODE)[keyof typeof MOCKGEN_ERROR_CODE];

/**
 * An error a caller or user can act on, identified by a stable {@link MockGenErrorCode}.
 *
 * @example
 * try {
 *     await createMockDataGenerator({ resourceRoot: 'relative/path' });
 * } catch (error) {
 *     if (error instanceof MockGenError && error.code === MOCKGEN_ERROR_CODE.CONFIGURATION_INVALID) {
 *         // fix the option
 *     }
 * }
 */
export class MockGenError extends Error {
    /** Stable code of the failure. */
    readonly code: MockGenErrorCode;

    /**
     * @param code stable code of the failure
     * @param message description for people; may be translated
     * @param options the underlying error, when one caused this failure
     * @param options.cause the error that caused this failure
     */
    constructor(code: MockGenErrorCode, message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = 'MockGenError';
        this.code = code;
    }
}
