import { type SystemConfig } from './types.js';

/**
 * Checks whether a system configuration is valid by verifying that it has either a URL or a destination defined.
 *
 * @param config - the system configuration to validate
 * @returns `true` if the configuration has a URL or destination, `false` otherwise
 */
export function isValidSystemConfig(config?: SystemConfig): boolean {
    if (!config) {
        return false;
    }
    const { url, destination } = config;
    return !!url || !!destination;
}

/**
 * Compares two system configurations for equality.
 * Two configurations are considered equal if they have the same normalized URL, client, and destination.
 * Returns `false` if either configuration is invalid.
 *
 * @param configA - the first system configuration
 * @param configB - the second system configuration
 * @returns `true` if both configurations are valid and equal, `false` otherwise
 */
export function areSystemConfigEquals(configA?: SystemConfig, configB?: SystemConfig): boolean {
    if (!isValidSystemConfig(configA) || !isValidSystemConfig(configB)) {
        return false;
    }

    return (
        normalizeSystemUrl(configA?.url) === normalizeSystemUrl(configB?.url) &&
        configA?.client === configB?.client &&
        configA?.destination === configB?.destination
    );
}

/**
 * Normalizes a system URL by trimming whitespace and removing a trailing slash.
 *
 * @param url - the URL to normalize
 * @returns the normalized URL, or `undefined` if no URL was provided
 */
function normalizeSystemUrl(url?: string): string | undefined {
    return url?.trim().replace(/\/$/, '');
}
