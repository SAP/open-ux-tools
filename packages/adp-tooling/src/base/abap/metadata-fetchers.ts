import type { Logger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Fetch remote $metadata for the given data source.
 *
 * @param dataSource - The data source object from your manifest.
 * @param baseUrl - The base URL.
 * @param provider - The ABAP Service Provider.
 * @param logger - Logger instance for logging.
 * @returns The metadata as a string.
 */
export async function fetchMetadata(
    dataSource: ManifestNamespace.DataSource,
    baseUrl: URL,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<string> {
    const metadataUrl = new URL(`${dataSource.uri}$metadata`, baseUrl.toString());
    logger.debug(`Fetching remote metadata from: ${metadataUrl.pathname}`);

    const response = await provider.get(metadataUrl.toString());
    return response.data;
}

/**
 * Fetch fallback metadata if the remote fetch fails and localUri is provided.
 *
 * @param dataSource - The data source object from your manifest.
 * @param baseUrl - The base URL.
 * @param provider - The ABAP Service Provider.
 * @param logger - Logger instance for logging.
 * @returns The fallback metadata as a string.
 */
export async function fetchFallbackMetadata(
    dataSource: ManifestNamespace.DataSource,
    baseUrl: URL,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<string> {
    if (!dataSource.settings?.localUri) {
        throw new Error('No localUri specified for the fallback fetch');
    }

    // Ensure trailing slash if needed
    const normalizedBase = baseUrl.toString().endsWith('/') ? baseUrl.toString() : baseUrl.toString() + '/';

    const fallbackUrl = new URL(dataSource.settings.localUri, normalizedBase);
    logger.debug(`Fetching local metadata from: ${fallbackUrl.pathname}`);

    const response = await provider.get(fallbackUrl.toString());
    return response.data;
}
