import fileSystem from 'fs';
import { join } from 'path';
import { render } from 'ejs';
import { MtaConfig } from './mta';
import { getTemplatePath } from '../utils';
import { MTAYamlFile, MTAVersion, MTADescription, deployMode, enableParallelDeployments } from '../constants';
import type { mta } from '@sap/mta-lib';
import type { Editor } from 'mem-fs-editor';
import type { MTABaseConfig } from '../types';

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
    return await MtaConfig.newInstance(rootPath);
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
 * Create an MTA file in the target folder, needs to be written to disk as subsequent calls are dependent on it being on the file system.
 *
 * @param config writer configuration
 * @param fs reference to a mem-fs editor
 */
export function createMTA(config: MTABaseConfig, fs: Editor): void {
    const mtaTemplate = fs.read(getTemplatePath(`app/${MTAYamlFile}`));
    const mtaContents = render(mtaTemplate, {
        id: config.mtaId,
        mtaDescription: config.mtaDescription ?? MTADescription,
        mtaVersion: config.mtaVersion ?? MTAVersion
    });
    fileSystem.writeFileSync(join(config.mtaPath, MTAYamlFile), mtaContents);
}

/**
 *  Add the build parameters to the MTA configuration.
 *
 * @param mtaInstance MTA instance
 */
export async function addBuildParams(mtaInstance: MtaConfig): Promise<void> {
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
export async function addParameters(mtaInstance: MtaConfig): Promise<void> {
    let params = await mtaInstance.getParameters();
    params = { ...(params || {}), ...{} } as mta.Parameters;
    params[deployMode] = 'html5-repo';
    params[enableParallelDeployments] = true;
    await mtaInstance.updateParameters(params);
}

export * from './mta';
