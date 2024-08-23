import type { ToolsLogger } from '@sap-ux/logger';
import { isAxiosError } from '@sap-ux/axios-extension';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';

import type { AdpPreviewConfig } from '../types';

/**
 * Get the application manifest.
 *
 * @param {string} appId - The application id.
 * @param {AdpPreviewConfig} adpConfig - The ADP configuration.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<Manifest>} The manifest.
 */
export async function getManifest(appId: string, adpConfig: AdpPreviewConfig, logger: ToolsLogger): Promise<Manifest> {
    const provider = await createAbapServiceProvider(
        adpConfig.target,
        {
            ignoreCertErrors: adpConfig.ignoreCertErrors ?? false
        },
        true,
        logger
    );

    const appInfo = (await provider.getAppIndex().getAppInfo(appId))[appId];
    const manifestUrl = appInfo.manifestUrl ?? appInfo.manifest;
    if (!manifestUrl) {
        throw new Error('Manifest URL not found');
    }
    try {
        const response = await provider.get(manifestUrl);
        return JSON.parse(response.data);
    } catch (error) {
        if (isAxiosError(error)) {
            logger.error('Manifest fetching failed');
        } else {
            logger.error('Manifest parsing error: Manifest is not in expected format.');
        }
        logger.debug(error);
        throw error;
    }
}

type DataSources = Record<string, ManifestNamespace.DataSource>;

/**
 * Returns the adaptation project configuration, throws an error if not found.
 *
 * @param {string} reference - The base application id.
 * @param {AdpPreviewConfig} adpConfig - The adaptation project configuration.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<DataSources>} data sources from base application manifest
 */
export async function getManifestDataSources(
    reference: string,
    adpConfig: AdpPreviewConfig,
    logger: ToolsLogger
): Promise<DataSources> {
    const manifest = await exports.getManifest(reference, adpConfig, logger);
    const dataSources = manifest['sap.app'].dataSources;
    if (!dataSources) {
        throw new Error('No data sources found in the manifest');
    }
    return dataSources;
}
