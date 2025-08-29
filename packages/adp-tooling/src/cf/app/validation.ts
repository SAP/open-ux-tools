import type AdmZip from 'adm-zip';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import type { AppContentService } from './content';
import type { CFApp, Credentials, CFConfig } from '../../types';
import { validateSmartTemplateApplication, validateODataEndpoints } from '../utils/validation';

/**
 * Validate a single app.
 *
 * @param {Manifest} manifest - The manifest to validate.
 * @param {AdmZip.IZipEntry[]} entries - The entries to validate.
 * @param {Credentials[]} credentials - The credentials for validation.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} Validation messages.
 */
export async function validateApp(
    manifest: Manifest,
    entries: AdmZip.IZipEntry[],
    credentials: Credentials[],
    logger: ToolsLogger
): Promise<string[]> {
    try {
        const smartTemplateMessages = await validateSmartTemplateApplication(manifest);

        if (smartTemplateMessages.length === 0) {
            return validateODataEndpoints(entries, credentials, logger);
        } else {
            return smartTemplateMessages;
        }
    } catch (e) {
        return [e.message];
    }
}

/**
 * Validate multiple apps.
 *
 * @param {CFApp[]} apps - The apps to validate.
 * @param {Credentials[]} credentials - The credentials for validation.
 * @param {CFConfig} cfConfig - The CF configuration.
 * @param {AppContentService} appContent - The app content service.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<CFApp[]>} The validated apps with messages.
 */
export async function getValidatedApps(
    apps: CFApp[],
    credentials: Credentials[],
    cfConfig: CFConfig,
    appContent: AppContentService,
    logger: ToolsLogger
): Promise<CFApp[]> {
    const validatedApps: CFApp[] = [];

    for (const app of apps) {
        if (!app.messages?.length) {
            const { entries, manifest } = await appContent.getAppContent(app, cfConfig);

            const messages = await validateApp(manifest, entries, credentials, logger);
            app.messages = messages;
        }
        validatedApps.push(app);
    }

    return validatedApps;
}
