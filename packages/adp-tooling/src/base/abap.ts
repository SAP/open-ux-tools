import type { Manifest } from '@sap-ux/project-access';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AdpPreviewConfig } from '../types';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { isAxiosError } from '@sap-ux/axios-extension';

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
