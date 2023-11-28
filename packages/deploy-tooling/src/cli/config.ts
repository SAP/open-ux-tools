import { UI5Config } from '@sap-ux/ui5-config';
import type { AxiosRequestConfig, BspConfig, ServiceInfo } from '@sap-ux/axios-extension';
import { readFileSync } from 'fs';
import { dirname, isAbsolute, join } from 'path';
import type { AbapDeployConfig, AbapTarget, CliOptions } from '../types';
import { NAME } from '../types';
import chalk from 'chalk';
import { isAppStudio } from '@sap-ux/btp-utils';

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
 * Read the environment variables to generate a service object.
 *
 * @param targetUrl target endpoint where app is being deployed to
 * @returns service key as js object
 */
function getServiceFromEnv(targetUrl: string | undefined): ServiceInfo {
    return {
        uaa: {
            clientid: process.env.SERVICE_CLIENT_ID,
            clientsecret: process.env.SERVICE_CLIENT_SECRET,
            url: process.env.SERVICE_UAA_URL,
            username: process.env.SERVICE_USERNAME,
            password: process.env.SERVICE_PASSWORD
        },
        url: targetUrl ?? process.env.SERVICE_URL,
        systemid: process.env.SERVICE_SYSTEM_ID
    } as ServiceInfo;
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
 * Generate the service object using either a service.json file or environment variables.
 *
 * @param options additional options
 * @param targetUrl target endpoint where app is being deployed to
 * @returns service key as js object
 */
function getServiceKey(options: CliOptions, targetUrl: string | undefined): undefined | ServiceInfo {
    let serviceKey;
    if (options.cloudServiceKey) {
        serviceKey = readServiceKeyFromFile(options.cloudServiceKey);
    } else if (options.cloudServiceEnv) {
        serviceKey = getServiceFromEnv(targetUrl);
    }
    return serviceKey;
}

/**
 * Merge CLI options into a base target configuration.
 *
 * @param baseTarget base target config
 * @param options additional options
 * @returns merged target object
 */
function mergeTarget(baseTarget: AbapTarget & { cloud?: boolean }, options: CliOptions) {
    const targetUrl = options.url ?? baseTarget?.url;
    return {
        url: targetUrl,
        client: options.client ?? baseTarget?.client,
        scp: options.cloud !== undefined ? options.cloud : baseTarget?.cloud,
        destination: options.destination ?? baseTarget?.destination,
        serviceKey: getServiceKey(options, targetUrl),
        params: options.queryParams ? parseQueryParams(options.queryParams) : undefined,
        service: options.service ?? baseTarget?.service
    } as AbapTarget;
}

/**
 * Merge CLI credentials.
 *
 * @param taskConfig - base configuration from the file
 * @param options - CLI options
 * @returns merged credentials
 */
function mergeCredentials(taskConfig: AbapDeployConfig, options: CliOptions) {
    let credentials = taskConfig.credentials;
    if (options.username || options.password) {
        credentials = {
            ...(credentials ?? {}),
            username: options.username ?? '',
            password: options.password ?? ''
        };
    }
    return credentials;
}

/**
 * Merge the configuration from the ui5*.yaml with CLI options.
 *
 * @param taskConfig - base configuration from the file
 * @param options - CLI options
 * @returns the merged config
 */
export async function mergeConfig(taskConfig: AbapDeployConfig, options: CliOptions): Promise<AbapDeployConfig> {
    const app: Partial<BspConfig> = {
        name: options.name ?? taskConfig.app?.name,
        description: options.description ?? taskConfig.app?.description,
        package: options.package ?? taskConfig.app?.package,
        transport: options.transport ?? taskConfig.app?.transport
    };
    const target = mergeTarget(taskConfig.target, options);
    const config: AbapDeployConfig = { app, target, credentials: mergeCredentials(taskConfig, options) };
    config.test = mergeFlag(options.test, taskConfig.test);
    config.safe = mergeFlag(options.safe, taskConfig.safe);
    config.keep = mergeFlag(options.keep, taskConfig.keep);
    config.strictSsl = mergeFlag(options.strictSsl, taskConfig.strictSsl);
    config.yes = mergeFlag(options.yes, taskConfig.yes);
    config.createTransport = mergeFlag(options.createTransport, taskConfig.createTransport);
    config.retry = process.env.NO_RETRY ? !process.env.NO_RETRY : mergeFlag(options.retry, taskConfig.retry);
    config.lrep = options.lrep;

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

/**
 * Display application properties during confirmation prompt.
 *
 * @param config
 * @param isUnDeployCmd, false by default
 */
export function showAppInfo(config: AbapDeployConfig, isUnDeployCmd = false): void {
    const displayList = [];
    const deployStr = isUnDeployCmd ? 'undeploy' : 'deploy';

    const _getDisplayValue = (field: boolean | string | undefined, defaultValue?: boolean | string) =>
        field ?? defaultValue ?? '';

    if (config.lrep || config.adaptation?.namespace) {
        displayList.unshift(
            `${chalk.blue('Repository Entry')}: ${_getDisplayValue(
                config.lrep ?? config.adaptation?.namespace?.toString() ?? ''
            )}`
        );
    } else {
        displayList.unshift(`${chalk.blue('Application Name')}: ${_getDisplayValue(config.app.name)}`);
    }

    if (isAppStudio()) {
        displayList.push(`${chalk.blue('Destination')}: ${_getDisplayValue(config.target.destination)}`);
    } else {
        displayList.push(`${chalk.blue('Target')}: ${_getDisplayValue(config.target.url)}`);
    }
    if (config.target.service) {
        displayList.push(`${chalk.blue('SAPUI5 OData Service Path')}: ${_getDisplayValue(config.target.service)}`);
    }

    console.log();
    console.log(
        chalk.blue.bold.underline(
            `${
                config.test
                    ? 'Confirmation is required to ' + deployStr + ' the app in test mode:'
                    : 'Confirmation is required to ' + deployStr + ' the app:'
            }`
        )
    );

    if (!config.strictSsl) {
        console.log(
            chalk.yellow(
                `You chose not to validate SSL certificate. Please verify the server certificate is trustful before proceeding, refer to https://help.sap.com/viewer/17d50220bcd848aa854c9c182d65b699/Latest/en-US/4b318bede7eb4021a8be385c46c74045.html.`
            )
        );
    }

    displayList.push(`${chalk.blue('Transport Request')}: ${_getDisplayValue(config.app.transport)}`);

    if (!isUnDeployCmd) {
        displayList.push(`${chalk.blue('Package')}: ${_getDisplayValue(config.app.package)}`);
        displayList.push(`${chalk.blue('Client')}: ${_getDisplayValue(config.target.client)}`);
        displayList.push(`${chalk.blue('Cloud')}: ${_getDisplayValue(config.target.scp, false)}`);
    }

    console.log('');
    // console.log spacing is important to ensure tabbing of each line when displayed
    displayList.filter((ele) => ele !== undefined).forEach((ele: string) => console.log(`    ${ele}`));
    console.log('');
}
