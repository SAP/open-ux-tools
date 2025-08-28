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
 * App Validation Service - Handles validation orchestration.
 */
export class AppValidationService {
    /**
     * Constructor.
     *
     * @param {ToolsLogger} logger - The logger.
     * @param {AppContentService} appContent - The app content service.
     */
    constructor(private logger: ToolsLogger, private appContent: AppContentService) {}

    /**
     * Validate multiple apps.
     *
     * @param {CFApp[]} apps - The apps to validate
     * @param {Credentials[]} credentials - The credentials for validation
     * @param {CFConfig} cfConfig - The CF configuration
     * @returns {Promise<CFApp[]>} The validated apps with messages
     */
    public async getValidatedApps(apps: CFApp[], credentials: Credentials[], cfConfig: CFConfig): Promise<CFApp[]> {
        const validatedApps: CFApp[] = [];

        for (const app of apps) {
            if (!app.messages?.length) {
                const { entries, manifest } = await this.appContent.getAppContent(app, cfConfig);

                const messages = await validateApp(manifest, entries, credentials, this.logger);
                app.messages = messages;
            }
            validatedApps.push(app);
        }

        return validatedApps;
    }
}
