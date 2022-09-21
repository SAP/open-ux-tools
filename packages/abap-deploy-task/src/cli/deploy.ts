import { UI5Config } from '@sap-ux/ui5-config';
import { readFileSync } from 'fs';
import { AbapDeployConfig, NAME } from '../types';

export async function getDeploymentConfig(path: string): Promise<AbapDeployConfig> {
    const content = readFileSync(path, 'utf-8');
    const ui5Config = await UI5Config.newInstance(content);
    const config = ui5Config.findCustomTask<AbapDeployConfig>(NAME)?.configuration;
    if (!config) {
        throw new Error('TODO');
    }
    return config;
}
