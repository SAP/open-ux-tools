import { UI5Config } from '@sap-ux/ui5-config';
import type { AxiosRequestConfig, BspConfig, ServiceInfo } from '@sap-ux/axios-extension';
import { readFileSync } from 'fs';
import { dirname, isAbsolute, join } from 'path';
import type { AbapDeployConfig, AbapTarget, CliOptions } from '../types';
import { NAME } from '../types';

/**
 * Tries to read the version of the modules package.json but in case of an error, it returns the manually maintained version matching major.minor of the module.
 *
 * @returns the version of the deploy tooling.
 */
export function getVersion() {
    try {
        const packageInfo = readFileSync(join(__dirname, '../../package.json'), 'utf-8');
        return JSON.parse(packageInfo).version;
    } catch (error) {
        return '0.1';
    }
}

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
 * Try reading a service key object from the given path an parse it as js object.
 *
 * @param path path to the service key json file
 * @returns service key as js object.
 */
function readServiceKeyFromFile(path: string): ServiceInfo {
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (error) {
        throw new Error(`Unable to read service key from from ${path}`);
    }
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
 * Parse a query string and return an object.
 *
 * @param query query string
 * @returns params object ready for axios requests
 */
function parseQueryParams(query: string): AxiosRequestConfig['params'] {
    const paramsList = query.split('&');
    const params: AxiosRequestConfig['params'] = {};
    paramsList.forEach((param) => {
        const [key, value] = param.split('=');
        if (value !== undefined) {
            params[key] = value;
        }
    });
    return params;
}

/**
 * Merge CLI options into a base target configuration.
 *
 * @param baseTarget base target config
 * @param options additional options
 * @returns merged target object
 */
function mergeTarget(baseTarget: AbapTarget, options: CliOptions) {
    return {
        url: options.url ?? baseTarget?.url,
        client: options.client ?? baseTarget?.client,
        cloud: options.cloud !== undefined ? options.cloud : baseTarget?.cloud,
        destination: options.destination ?? baseTarget?.destination,
        serviceKey: options.cloudServiceKey ? readServiceKeyFromFile(options.cloudServiceKey) : undefined,
        params: options.queryParams ? parseQueryParams(options.queryParams) : undefined
    } as AbapTarget;
}

/**
 * Merge the configuration from the ui5*.yaml with CLI options.
 *
 * @param taskConfig - base configuration from the file
 * @param options - CLI options
 * @returns the merged config
 */
export async function mergeConfig(taskConfig: AbapDeployConfig, options: CliOptions): Promise<AbapDeployConfig> {
    const app: BspConfig = {
        name: options.name ?? taskConfig.app?.name,
        description: options.description ?? taskConfig.app?.description,
        package: options.package ?? taskConfig.app?.package,
        transport: options.transport ?? taskConfig.app?.transport
    };
    const target = mergeTarget(taskConfig.target, options);
    const config: AbapDeployConfig = { app, target, credentials: taskConfig.credentials };
    config.test = mergeFlag(options.test, taskConfig.test);
    config.safe = mergeFlag(options.safe, taskConfig.safe);
    config.keep = mergeFlag(options.keep, taskConfig.keep);
    config.strictSsl = mergeFlag(options.strictSsl, taskConfig.strictSsl);
    config.yes = mergeFlag(options.yes, taskConfig.yes);

    if (!options.archiveUrl && !options.archivePath && !options.archiveFolder) {
        options.archiveFolder = 'dist';
    }
    if (options.config && options.archiveFolder && !isAbsolute(options.archiveFolder)) {
        options.archiveFolder = join(dirname(options.config), options.archiveFolder);
    }

    if (options.config && options.archivePath && !isAbsolute(options.archivePath)) {
        options.archivePath = join(dirname(options.config), options.archivePath);
    }

    return config;
}
