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
function extractNodeErrorCode(errorMessage: string): string | null {
    const nodeErrorPattern = /\b(E[A-Z]+):/;
    const match = nodeErrorPattern.exec(errorMessage);
    if (match) {
        const code = match[1];
        if (code in MigrationErrorCode) {
            return code;
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
function matchParsingError(lowerMessage: string): string | null {
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
function matchKnownPatterns(lowerMessage: string): string | null {
    if (lowerMessage.includes('not supported') || lowerMessage.includes('unsupported')) {
        if (lowerMessage.includes('floorplan')) {
            return MigrationErrorCode.UNSUPPORTED_FLOORPLAN;
        }
    }

    if (lowerMessage.includes('not suitable for migration')) {
        return MigrationErrorCode.NOT_SUITABLE_FOR_MIGRATION;
    }

    if (lowerMessage.includes('failed to get project info')) {
        return MigrationErrorCode.PROJECT_INFO_FAILED;
    }

    if (lowerMessage.includes('committing')) {
        return MigrationErrorCode.COMMIT_FAILED;
    }

    if (lowerMessage.includes('typescript') || lowerMessage.includes('enabling typescript')) {
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
 * Extract a telemetry-safe error code from an error object or message string.
 * This function extracts standard codes (file system errors, known patterns) without
 * including any PII, paths, or sensitive data.
 *
 * @param error - Error object, string, or unknown error
 * @returns A safe error code string for telemetry
 * @example
 * extractErrorCode(new Error('ENOENT: no such file or directory'))
 * // Returns: 'ENOENT'
 *
 * extractErrorCode('The V2_ANALYTICAL floorplan is not supported')
 * // Returns: 'UNSUPPORTED_FLOORPLAN'
 */
export function extractErrorCode(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Try Node.js error codes first (highest priority)
    const nodeCode = extractNodeErrorCode(errorMessage);
    if (nodeCode) {
        return nodeCode;
    }

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

/**
 * Create an error code from an i18n key. I18n keys are safe to report in telemetry
 * as they don't contain user data.
 *
 * @param i18nKey - i18n key like 'ERROR_NOT_SUITABLE_FOR_MIGRATION'
 * @returns The i18n key as the error code
 */
export function errorCodeFromI18nKey(i18nKey: string): string {
    return i18nKey;
}
