/**
 * Validation severity utilities for strict mode
 */

/**
 * Determine message type based on strict mode and criticality
 *
 * @param defaultType - Default message type (WARNING or ERROR)
 * @param isStrictMode - Whether strict validation is enabled
 * @param isCritical - Whether this is a critical validation (true = becomes ERROR in strict mode)
 * @returns Message type to use
 */
export function getMessageType(
    defaultType: 'WARNING' | 'ERROR',
    isStrictMode: boolean,
    isCritical: boolean = true
): 'WARNING' | 'ERROR' {
    // If already an error, keep it as error
    if (defaultType === 'ERROR') {
        return 'ERROR';
    }

    // In strict mode, critical warnings become errors
    if (isStrictMode && isCritical) {
        return 'ERROR';
    }

    // Otherwise use the default
    return defaultType;
}

/**
 * Check if strict mode is enabled from context
 * Can be expanded to read from config file or environment variables
 *
 * @param explicitStrict - Explicitly passed strict flag
 * @returns Whether strict mode is active
 */
export function isStrictModeEnabled(explicitStrict?: boolean): boolean {
    // Check explicit parameter first
    if (explicitStrict !== undefined) {
        return explicitStrict;
    }

    // Could check environment variable
    if (process.env.FIORI_MIGRATION_STRICT === 'true') {
        return true;
    }

    // Default to lenient mode
    return false;
}
