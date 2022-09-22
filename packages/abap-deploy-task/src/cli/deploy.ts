import { UI5Config } from '@sap-ux/ui5-config';
import { readFileSync } from 'fs';
import type { AbapDeployConfig } from '../types';
import { NAME } from '../types';

/**
 * Read the deployment configuration from a ui5*.yaml file.
 *
 * @param path - path to the ui5*.yaml file
 * @returns the configuration object or throws an error if it cannot be read.
 */
export async function getDeploymentConfig(path: string): Promise<AbapDeployConfig> {
    const content = readFileSync(path, 'utf-8');
    const ui5Config = await UI5Config.newInstance(content);
    const config = ui5Config.findCustomTask<AbapDeployConfig>(NAME)?.configuration;
    if (!config) {
        throw new Error('TODO');
    }
    return config;
}
