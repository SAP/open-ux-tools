import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import { getServicesForFile, updateServiceInstance } from '@sap-ux/adp-tooling';

/**
 * Update the XSUAA service instance with oauth2-configuration redirect-uris
 * so that OAuth redirects work correctly in the BAS environment.
 *
 * @param rootPath - Project root path (app folder; mta.yaml and xs-security.json are one level up).
 * @param logger - Logger instance.
 */
export async function updateXsuaaService(rootPath: string, logger: ToolsLogger): Promise<void> {
    try {
        const projectRoot = path.resolve(rootPath, '..');
        const xsSecurityPath = path.resolve(projectRoot, 'xs-security.json');
        const mtaPath = path.resolve(projectRoot, 'mta.yaml');

        if (!fs.existsSync(xsSecurityPath)) {
            logger.warn(`xs-security.json not found at "${xsSecurityPath}", skipping XSUAA service update.`);
            return;
        }

        if (!fs.existsSync(mtaPath)) {
            logger.warn(`mta.yaml not found at "${mtaPath}", skipping XSUAA service update.`);
            return;
        }

        const xsSecurityContent = JSON.parse(fs.readFileSync(xsSecurityPath, 'utf-8'));
        const augmented = {
            ...xsSecurityContent,
            'oauth2-configuration': {
                'redirect-uris': ['https://**.applicationstudio.cloud.sap/**', 'http://localhost:*/**']
            }
        };

        const mtaServices = getServicesForFile(mtaPath, logger);
        const serviceInstanceName = mtaServices.find((s) => s.label === 'xsuaa')?.name;
        if (!serviceInstanceName) {
            logger.warn('No xsuaa service instance name found in mta.yaml, skipping XSUAA service update.');
            return;
        }

        logger.info(`Updating XSUAA service instance "${serviceInstanceName}" with BAS redirect-uris.`);
        await updateServiceInstance(serviceInstanceName, augmented);
        logger.info(`XSUAA service instance "${serviceInstanceName}" updated successfully.`);
    } catch (e) {
        logger.error(`Failed to update XSUAA service instance for BAS: ${e.message}`);
    }
}
