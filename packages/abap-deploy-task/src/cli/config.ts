import { UI5Config } from '@sap-ux/ui5-config';
import { readFileSync } from 'fs';
import type { AbapDeployConfig, AbapTarget, AbapDescriptor, CliOptions } from '../types';
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
        throw new Error('The deployment configuration is missing.');
    }
    return config;
}

/**
 *
 * @param taskConfig
 * @param options
 * @returns the merged config
 */
export async function mergeConfig(
    taskConfig: Partial<AbapDeployConfig>,
    options: CliOptions
): Promise<AbapDeployConfig> {
    const app = {
        name: options.name ?? taskConfig.app?.name,
        desription: options.desription ?? taskConfig.app?.desription,
        package: options.package ?? taskConfig.app?.package,
        transport: options.transport ?? taskConfig.app?.transport
    } as AbapDescriptor;
    const target = {
        url: options.url ?? taskConfig.target?.url,
        client: options.client ?? taskConfig.target?.client,
        destination: options.destination ?? taskConfig.target?.destination,
        scp: options.scp !== undefined ? options.scp : taskConfig.target?.scp
    } as AbapTarget;
    const test = options.test !== undefined ? options.test : taskConfig.test;
    const yes = options.yes;
    const config = { app, target, test, yes };
    return config;
}
