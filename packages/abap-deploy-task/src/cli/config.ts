import { UI5Config } from '@sap-ux/ui5-config';
import { readFileSync } from 'fs';
import { t } from '../messages';
import type { AbapDeployConfig, AbapTarget, CliOptions } from '../types';
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
        throw new Error(t('NO_CONFIG_ERROR'));
    }
    return config;
}

/**
 *
 * @param taskConfig
 * @param options
 * @returns the merged config
 */
export function mergeConfig(taskConfig: Partial<AbapDeployConfig>, options: CliOptions): AbapDeployConfig {
    const app = {
        name: taskConfig.app?.name ?? options.name,
        desription: taskConfig.app?.desription ?? options.desription,
        package: taskConfig.app?.package ?? options.package,
        transport: taskConfig.app?.transport ?? options.transport
    } as AbapDeployConfig['app'];
    const test = options.test !== undefined ? options.test : taskConfig.test;

    return { app, target: taskConfig.target as AbapTarget, test };
}
