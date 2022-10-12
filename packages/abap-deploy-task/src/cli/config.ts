import { UI5Config } from '@sap-ux/ui5-config';
import { readFileSync } from 'fs';
import { dirname, isAbsolute, join } from 'path';
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
 * Boolean merger.
 *
 * @param cli - optional flag from CLI
 * @param file - optional flag from file
 * @returns merged flag
 */
function mergeFlag(cli?: boolean, file?: boolean): boolean | undefined {
    return cli !== undefined ? cli : file;
}

/**
 * Merge the configuration from the ui5*.yaml with CLI options.
 *
 * @param taskConfig - base configuration from the file
 * @param options - CLI options
 * @returns the merged config
 */
export async function mergeConfig(taskConfig: AbapDeployConfig, options: CliOptions): Promise<AbapDeployConfig> {
    const app: AbapDescriptor = {
        name: options.name ?? taskConfig.app?.name,
        desription: options.desription ?? taskConfig.app?.desription,
        'package': options.package ?? taskConfig.app?.package,
        transport: options.transport ?? taskConfig.app?.transport
    };
    const target = {
        url: options.url ?? taskConfig.target?.url,
        client: options.client ?? taskConfig.target?.client,
        scp: options.scp !== undefined ? options.scp : taskConfig.target?.scp,
        destination: options.destination ?? taskConfig.target?.destination
    } as AbapTarget;

    const config: AbapDeployConfig = { app, target, credentials: taskConfig.credentials };
    config.test = mergeFlag(options.test, taskConfig.test);
    config.keep = mergeFlag(options.keep, taskConfig.keep);
    config.strictSsl = mergeFlag(options.strictSsl, taskConfig.strictSsl);
    config.yes = mergeFlag(options.yes, taskConfig.yes);

    if (!options.archiveUrl && !options.archivePath && !options.archiveFolder) {
        options.archiveFolder = 'dist';
    }

    if (options.archiveFolder && !isAbsolute(options.archiveFolder)) {
        options.archiveFolder = join(dirname(options.config), options.archiveFolder);
    }

    if (options.archivePath && !isAbsolute(options.archivePath)) {
        options.archivePath = join(dirname(options.config), options.archivePath);
    }

    return config;
}
