import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { readUi5Yaml } from '@sap-ux/project-access';
import type { AdpPreviewConfig } from '../types';

/**
 * Check if the project is a CF project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {boolean} true if the project is a CF project, false otherwise
 */
export async function isCFEnvironment(basePath: string): Promise<boolean> {
    const configJsonPath = join(basePath, '.adp', 'config.json');
    if (existsSync(configJsonPath)) {
        const config = JSON.parse(readFileSync(configJsonPath, 'utf-8'));
        if (config.environment === 'CF') {
            return true;
        }
    }

    try {
        const ui5Config = await readUi5Yaml(basePath, 'ui5.yaml');
        const customMiddleware =
            ui5Config.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
            ui5Config.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');
        const adpConfig = customMiddleware?.configuration?.adp;
        if (adpConfig && 'cfBuildPath' in adpConfig && adpConfig.cfBuildPath === 'dist') {
            return true;
        }
    } catch {
        return false;
    }
    return false;
}
