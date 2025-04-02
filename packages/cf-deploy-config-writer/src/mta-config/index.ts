import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { render } from 'ejs';
import { MtaConfig } from './mta';
import { getTemplatePath, setMtaDefaults, validateVersion } from '../utils';
import {
    MTAYamlFile,
    MTAVersion,
    MTADescription,
    deployMode,
    enableParallelDeployments,
    CDSAddMtaParams,
    CDSBinNotFound,
    CDSExecutable,
    MTABinNotFound,
    MTAExecutable,
    CDSXSUAAService,
    CDSDestinationService,
    CDSHTML5RepoService
} from '../constants';
import type { mta } from '@sap/mta-lib';
import { type MTABaseConfig, type CFBaseConfig, type CDSServiceType, RouterModuleType } from '../types';
import LoggerHelper from '../logger-helper';
import { sync } from 'hasbin';
import { t } from '../i18n';
import { CommandRunner } from '@sap-ux/nodejs-utils';

/**
 * Get the MTA ID, read from the root path specified.
 *
 * @param rootPath Path to the root folder
 * @returns MTA ID if found
 */
export async function getMtaId(rootPath: string): Promise<string | undefined> {
    return (await getMtaConfig(rootPath))?.prefix;
}

/**
 *  Get the MTA configuration from the target folder.
 *
 * @param rootPath Path to the root folder
 * @returns MtaConfig instance if found
 */
export async function getMtaConfig(rootPath: string): Promise<MtaConfig | undefined> {
    let mtaConfig;
    for (let retries = 5; retries >= 0; retries--) {
        try {
            mtaConfig = await MtaConfig.newInstance(rootPath, LoggerHelper.logger);
            if (mtaConfig?.prefix) {
                break;
            }
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    LoggerHelper.logger?.info(`Read mta.yaml with prefix ${mtaConfig?.prefix}`);
    return mtaConfig;
}

/**
 *  Generate an MTA ID that is suitable for CF deployment.
 *
 * @param appId Name of the app, like `sap.ux.app` and restrict to 128 characters
 * @returns Name that's acceptable for mta.yaml
 */
export function toMtaModuleName(appId: string): string {
    return appId.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>]/gi, '').slice(0, 128);
}

/**
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system i.e mta-lib.
 *
 * @param config writer configuration
 */
export function createMTA(config: MTABaseConfig): void {
    const mtaTemplate = readFileSync(getTemplatePath(`app/${MTAYamlFile}`), 'utf-8');
    const mtaContents = render(mtaTemplate, {
        id: `${config.mtaId.slice(0, 128)}`,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    // Written to disk immediately! Subsequent calls are dependent on it being on the file system i.e mta-lib.
    writeFileSync(join(config.mtaPath, MTAYamlFile), mtaContents);
    LoggerHelper.logger?.debug(t('debug.mtaCreated', { mtaPath: config.mtaPath }));
}

/**
 *  Add the build parameters to the MTA configuration.
 *
 * @param mtaInstance MTA instance
 */
export async function addMtaBuildParams(mtaInstance: MtaConfig): Promise<void> {
    let params = await mtaInstance.getBuildParameters();
    params = { ...(params || {}), ...{} } as mta.ProjectBuildParameters;
    params['before-all'] ||= [];
    const buildParams: mta.BuildParameters = { builder: 'custom', commands: ['npm install'] };
    params['before-all'].push(buildParams);
    await mtaInstance.updateBuildParams(params);
}

/**
 * Add the deployment parameters to the MTA configuration.
 *
 * @param mtaInstance MTA instance
 */
export async function addMtaDeployParameters(mtaInstance: MtaConfig): Promise<void> {
    let params = await mtaInstance.getParameters();
    params = { ...(params || {}), ...{} } as mta.Parameters;
    params[deployMode] = 'html5-repo';
    params[enableParallelDeployments] = true;
    await mtaInstance.updateParameters(params);
}

/**
 * Validate MTA binary is available.
 *
 */
export function doesMTABinaryExist(): void {
    // CF Writer is dependent on the mta-lib library, which in turn relies on the mta executable being installed and available in the path
    if (!sync(MTAExecutable)) {
        throw new Error(MTABinNotFound);
    }
}

/**
 * Validate CDS binary is available.
 *
 */
export function doesCDSBinaryExist(): void {
    // CF Writer is dependent on the cds library
    if (!sync(CDSExecutable)) {
        throw new Error(CDSBinNotFound);
    }
}

/**
 * Generate an MTA using `cds` binary, appending any optional services passed in. Specific services are added if the router type is defined.
 *
 * @param cwd
 * @param options
 * @param routerType
 */
export async function createCAPMTA(
    cwd: string,
    options?: CDSServiceType[],
    routerType?: RouterModuleType
): Promise<void> {
    let defaultOptions: CDSServiceType[] = [];
    if (routerType) {
        defaultOptions = [CDSXSUAAService, CDSDestinationService, CDSHTML5RepoService] as CDSServiceType[];
    }
    const cdsParams = [...CDSAddMtaParams, ...(options ?? []), ...defaultOptions];
    LoggerHelper.logger?.debug(t('debug.creatingMta', { cdsParams: cdsParams.toString() }));
    await runCommand(cwd, CDSExecutable, cdsParams, t('error.errorGeneratingMtaYaml'));
    // Ensure the package-lock is updated otherwise mta build will fail
    const cmd = process.platform === 'win32' ? `npm.cmd` : 'npm';
    await runCommand(cwd, cmd, ['update', '--package-lock-only'], t('error.errorInstallingNodeModules'));
    LoggerHelper.logger?.debug(t('debug.capMtaCreated'));
}

/**
 * Validate the writer configuration to ensure all required parameters are present.
 *
 * @param config writer configuration
 */
export function validateMtaConfig(config: CFBaseConfig): void {
    // We use mta-lib, which in turn relies on the mta executable being installed and available in the path
    doesMTABinaryExist();

    if (!config.routerType || !config.mtaId || !config.mtaPath) {
        throw new Error(t('error.missingMtaParameters'));
    }
    if (config.mtaId.length > 128 || !/^[a-zA-Z_]/.test(config.mtaId)) {
        throw new Error(t('error.invalidMtaId'));
    }
    if (!/^[\w\-.]*$/.test(config.mtaId)) {
        throw new Error(t('error.invalidMtaIdWithChars'));
    }

    validateVersion(config.mtaVersion);

    if (
        config.abapServiceProvider &&
        (!config.abapServiceProvider.abapService || !config.abapServiceProvider.abapServiceName)
    ) {
        throw new Error(t('error.missingABAPServiceBindingDetails'));
    }

    setMtaDefaults(config);
}

/**
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system i.e mta-lib.
 *
 * @param config writer configuration
 * @param isCap whether MTA should support CAP
 */
export async function createAppfrontendMta(config: MTABaseConfig, isCap = false): Promise<void> {
    const mtaTemplate = readFileSync(getTemplatePath(`frontend/${isCap ? 'mta-cap.yaml' : MTAYamlFile}`), 'utf-8');
    const mtaContents = render(mtaTemplate, {
        id: `${config.mtaId.slice(0, 128)}`,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    // Written to disk immediately! Subsequent calls are dependent on it being on the file system i.e mta-lib.
    writeFileSync(join(config.mtaPath, MTAYamlFile), mtaContents);
    // Ensure the package-lock is created otherwise mta build will fail
    const cmd = process.platform === 'win32' ? `npm.cmd` : 'npm';
    await runCommand(config.mtaPath, cmd, ['install', '--ignore-engines'], t('error.errorInstallingNodeModules'));
    LoggerHelper.logger?.debug(t('debug.mtaCreated', { mtaPath: config.mtaPath }));
}

/**
 * Executes a command in the specified project directory.
 *
 * @param {string} cwd - working directory
 * @param {string} cmd - command to execute
 * @param args  - arguments to pass to the command
 * @param errorMsg - error message to display if the command fails
 */
export async function runCommand(cwd: string, cmd: string, args: string[] = [], errorMsg: string): Promise<void> {
    const commandRunner = new CommandRunner();
    try {
        await commandRunner.run(cmd, args, { cwd });
    } catch (e) {
        throw new Error(`${errorMsg} ${e.message}`);
    }
}

export * from './mta';
