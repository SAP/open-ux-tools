/**
 * Standard error codes for migration errors, safe to send in telemetry.
 * These codes contain no PII, paths, or sensitive data.
 */
export const MigrationErrorCode = {
    // File system errors (Node.js error codes)
    ENOENT: 'ENOENT',
    EACCES: 'EACCES',
    EEXIST: 'EEXIST',
    EBUSY: 'EBUSY',
    EISDIR: 'EISDIR',
    ENOTDIR: 'ENOTDIR',
    EPERM: 'EPERM',

    // Parsing errors
    MANIFEST_PARSE_ERROR: 'MANIFEST_PARSE_ERROR',
    JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
    YAML_PARSE_ERROR: 'YAML_PARSE_ERROR',
    XML_PARSE_ERROR: 'XML_PARSE_ERROR',

    // Configuration errors
    UNSUPPORTED_FLOORPLAN: 'UNSUPPORTED_FLOORPLAN',
    MISSING_MANIFEST: 'MISSING_MANIFEST',
    MISSING_COMPONENT: 'MISSING_COMPONENT',
    MISSING_ODATA_SERVICE: 'MISSING_ODATA_SERVICE',
    INVALID_PROJECT_STRUCTURE: 'INVALID_PROJECT_STRUCTURE',

    // Migration process errors
    MIGRATION_FAILED: 'MIGRATION_FAILED',
    COMMIT_FAILED: 'COMMIT_FAILED',
    TYPESCRIPT_SETUP_FAILED: 'TYPESCRIPT_SETUP_FAILED',
    COPY_FILES_FAILED: 'COPY_FILES_FAILED',
    TEMPLATE_GENERATION_FAILED: 'TEMPLATE_GENERATION_FAILED',

    // Validation errors
    NOT_SUITABLE_FOR_MIGRATION: 'NOT_SUITABLE_FOR_MIGRATION',
    PROJECT_INFO_FAILED: 'PROJECT_INFO_FAILED',

    // Unknown/generic error
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type MigrationErrorCode = (typeof MigrationErrorCode)[keyof typeof MigrationErrorCode];

/**
 * Extract Node.js file system error code from error message.
 *
 * @param errorMessage - Error message string
 * @returns Error code if found and valid, null otherwise
 */
function extractNodeErrorCode(errorMessage: string): MigrationErrorCode | null {
    const nodeErrorPattern = /\b(E[A-Z]+):/;
    const match = nodeErrorPattern.exec(errorMessage);
    if (match) {
        const code = match[1];
        if (Object.hasOwn(MigrationErrorCode, code)) {
            return code as MigrationErrorCode;
        }
    }
    return null;
}

/**
 * Match parsing-related error patterns.
 *
 * @param lowerMessage - Lowercase error message
 * @returns Error code if pattern matches, null otherwise
 */
function matchParsingError(lowerMessage: string): MigrationErrorCode | null {
    if (!lowerMessage.includes('parse') && !lowerMessage.includes('parsing')) {
        return null;
    }

    if (lowerMessage.includes('manifest')) {
        return MigrationErrorCode.MANIFEST_PARSE_ERROR;
    }
    if (lowerMessage.includes('json')) {
        return MigrationErrorCode.JSON_PARSE_ERROR;
    }
    if (lowerMessage.includes('yaml') || lowerMessage.includes('yml')) {
        return MigrationErrorCode.YAML_PARSE_ERROR;
    }
    if (lowerMessage.includes('xml')) {
        return MigrationErrorCode.XML_PARSE_ERROR;
    }

    return null;
}

/**
 * Match configuration and migration process error patterns.
 *
 * @param lowerMessage - Lowercase error message
 * @returns Error code if pattern matches, null otherwise
 */
function matchKnownPatterns(lowerMessage: string): MigrationErrorCode | null {
    // Check unsupported patterns
    if (
        (lowerMessage.includes('not supported') || lowerMessage.includes('unsupported')) &&
        /\bfloorplan\b/.test(lowerMessage)
    ) {
        return MigrationErrorCode.UNSUPPORTED_FLOORPLAN;
    }

    // Check for missing manifest
    if (
        (lowerMessage.includes('manifest') || lowerMessage.includes('manifest.json')) &&
        (lowerMessage.includes('not found') ||
            lowerMessage.includes('missing') ||
            lowerMessage.includes('does not exist') ||
            lowerMessage.includes('no such file'))
    ) {
        return MigrationErrorCode.MISSING_MANIFEST;
    }

    // Check for missing Component.js
    if (
        (lowerMessage.includes('component.js') || lowerMessage.includes('component')) &&
        (lowerMessage.includes('not found') ||
            lowerMessage.includes('missing') ||
            lowerMessage.includes('does not exist') ||
            lowerMessage.includes('no such file'))
    ) {
        return MigrationErrorCode.MISSING_COMPONENT;
    }

    // Simple substring checks (early returns for better readability)
    if (lowerMessage.includes('not suitable for migration')) {
        return MigrationErrorCode.NOT_SUITABLE_FOR_MIGRATION;
    }

    if (lowerMessage.includes('failed to get project info')) {
        return MigrationErrorCode.PROJECT_INFO_FAILED;
    }

    if (lowerMessage.includes('error committing migration') || lowerMessage.includes('failed to commit migration')) {
        return MigrationErrorCode.COMMIT_FAILED;
    }

    if (lowerMessage.includes('typescript') && (lowerMessage.includes('setup') || lowerMessage.includes('enabl'))) {
        return MigrationErrorCode.TYPESCRIPT_SETUP_FAILED;
    }

    if (lowerMessage.includes('copying') && (lowerMessage.includes('files') || lowerMessage.includes('adaptation'))) {
        return MigrationErrorCode.COPY_FILES_FAILED;
    }

    if (lowerMessage.includes('migration') && lowerMessage.includes('error')) {
        return MigrationErrorCode.MIGRATION_FAILED;
    }

    return null;
}

/**
 * Extract error code from MigrationError, checking wrapped cause for more specific code.
 *
 * @param error - MigrationError instance
 * @param depth - Recursion depth to prevent stack overflow from circular error chains
 * @returns Error code from wrapped error if available, otherwise MIGRATION_FAILED
 */
function extractFromMigrationError(error: Error, depth = 0): MigrationErrorCode {
    // Prevent stack overflow from circular error.cause chains
    if (depth > 5) {
        return MigrationErrorCode.MIGRATION_FAILED;
    }

    // Check if MigrationError wraps another error - extract code from the wrapped error
    // for more specific telemetry (e.g., ENOENT instead of generic MIGRATION_FAILED)
    if ('cause' in error && error.cause) {
        const wrappedCode = extractErrorCode(error.cause, depth + 1);
        // Only use wrapped code when cause produces something more specific than UNKNOWN_ERROR
        if (wrappedCode !== MigrationErrorCode.UNKNOWN_ERROR) {
            return wrappedCode;
        }
    }
    return MigrationErrorCode.MIGRATION_FAILED;
}

/**
 * Classify SyntaxError by inspecting the error message context.
 * Distinguishes between JSON, YAML, XML parsing errors and template rendering errors.
 *
 * @param message - Error message string
 * @returns Appropriate error code based on context
 */
function classifySyntaxError(message: string): MigrationErrorCode {
    const lowerMessage = message.toLowerCase();

    // Check for template/EJS-specific patterns
    if (lowerMessage.includes('template') || lowerMessage.includes('ejs') || lowerMessage.includes('render')) {
        return MigrationErrorCode.TEMPLATE_GENERATION_FAILED;
    }

    // Check for YAML/XML patterns (before defaulting to JSON)
    if (lowerMessage.includes('yaml') || lowerMessage.includes('yml')) {
        return MigrationErrorCode.YAML_PARSE_ERROR;
    }
    if (lowerMessage.includes('xml')) {
        return MigrationErrorCode.XML_PARSE_ERROR;
    }

    // Default to JSON_PARSE_ERROR (most common case in migration workflows)
    return MigrationErrorCode.JSON_PARSE_ERROR;
}

/**
 * Extract a telemetry-safe error code from an error object or message string.
 * Priority order for extraction:
 * 1. Error.name for custom error types (UnsupportedProjectError, MigrationError, etc.)
 * 2. Error.code for Node.js filesystem errors (ENOENT, EACCES, etc.)
 * 3. Pattern matching in error message (fallback for external library errors).
 *
 * @param error - Error object, string, or unknown error
 * @param depth - Internal recursion depth counter (for circular error.cause chains)
 * @returns A safe error code string for telemetry (no PII, paths, or sensitive data)
 * @example
 * extractErrorCode(new UnsupportedProjectError('...'))
 * // Returns: 'NOT_SUITABLE_FOR_MIGRATION'
 *
 * extractErrorCode(Object.assign(new Error('file not found'), { code: 'ENOENT' }))
 * // Returns: 'ENOENT'
 *
 * extractErrorCode(new Error('Failed to parse manifest.json'))
 * // Returns: 'MANIFEST_PARSE_ERROR'
 */
export function extractErrorCode(error: unknown, depth = 0): MigrationErrorCode {
    // Priority 1: Check error.name for custom error types (most explicit)
    if (error instanceof Error) {
        switch (error.name) {
            case 'UnsupportedProjectError':
                return MigrationErrorCode.NOT_SUITABLE_FOR_MIGRATION;
            case 'MigrationError':
                return extractFromMigrationError(error, depth);
            default:
                // Fall through to check error.code and message patterns
                break;
        }

        // Priority 2: Check error.code for Node.js filesystem errors (explicit property)
        if ('code' in error && typeof error.code === 'string') {
            const nodeCode = error.code;
            if (Object.hasOwn(MigrationErrorCode, nodeCode)) {
                return nodeCode as MigrationErrorCode;
            }
        }

        // Priority 3: Check SyntaxError name AFTER error.code check
        // (a SyntaxError with a code property should use that code instead)
        if (error.name === 'SyntaxError') {
            return classifySyntaxError(error.message);
        }
    }

    // Priority 3: Extract from error message (fallback for external library errors)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Try Node.js error codes in message (e.g., "ENOENT: no such file")
    const nodeCode = extractNodeErrorCode(errorMessage);
    if (nodeCode) {
        return nodeCode;
    }

    // Note: Order matters - parsing errors are checked before known patterns.
    // A message like "manifest.json missing component definition" will match
    // MANIFEST_PARSE_ERROR (from "parse" substring) before MISSING_COMPONENT.
    // This is intentional - parsing errors take precedence over structural issues.

    // Try parsing errors
    const parseCode = matchParsingError(lowerMessage);
    if (parseCode) {
        return parseCode;
    }

    // Try other known patterns
    const patternCode = matchKnownPatterns(lowerMessage);
    if (patternCode) {
        return patternCode;
    }

    // Default to unknown if no pattern matches
    return MigrationErrorCode.UNKNOWN_ERROR;
}
