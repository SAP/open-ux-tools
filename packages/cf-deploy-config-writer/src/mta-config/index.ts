import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { render } from 'ejs';
import { MtaConfig } from './mta';
import { getTemplatePath } from '../utils';
import { MTAYamlFile, MTAVersion, MTADescription, deployMode, enableParallelDeployments } from '../constants';
import type { mta } from '@sap/mta-lib';
import type { MTABaseConfig } from '../types';
import LoggerHelper from '../logger-helper';

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
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
    LoggerHelper.logger?.info(`Read mta.yaml with prefix ${mtaConfig?.prefix}`);
    return mtaConfig;
}

/**
 *  Generate an MTA ID that is suitable for CF deployment.
 *
 * @param appId Name of the app, like `sap.ux.app` and restrict to 128 characters
 * @returns Name that's acceptable in an mta.yaml
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
        id: config.mtaId,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    // Written to disk immediately! Subsequent calls are dependent on it being on the file system i.e mta-lib.
    writeFileSync(join(config.mtaPath, MTAYamlFile), mtaContents);
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
 * Add the deploy parameters to the MTA configuration.
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

export * from './mta';
