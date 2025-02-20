import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import {
    API_BUSINESS_HUB_ENTERPRISE_PREFIX,
    loadManifest,
    type ApiHubConfig,
    ApiHubType
} from '@sap-ux/cf-deploy-config-sub-generator';
import { generateDestinationName } from '@sap-ux/deploy-config-generator-shared';
import { DeployProjectType } from '@sap-ux/abap-deploy-config-sub-generator';
import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '@sap-ux/project-access';
import type { DeployConfigOptions, Target } from '../types';
import { cfChoice, abapChoice } from '../utils';

/**
 * Parses the target from the CLI args or the options.
 *
 * @param args - cli args
 * @param opts - options
 * @returns - the target
 */
export function parseTarget(args: string | string[], opts: DeployConfigOptions): string | undefined {
    let result: string | undefined;
    if (typeof args === 'string') {
        result = args;
    } else if (Array.isArray(args)) {
        result = args?.[0];
    }
    if (!result) {
        result = opts.target;
    }
    return result;
}

/**
 * Returns the destination name for API Hub Enterprise.
 *
 * @param memFs - reference to a mem-fs editor
 * @param opts -options representing the project app path and service path
 * @param opts.appPath - path to project
 * @param opts.servicePath - service path
 * @param apiHubConfig - API Hub Config
 * @returns - destination name
 */
export async function getApiHubOptions(
    memFs: Editor,
    { appPath, servicePath }: { appPath: string; servicePath: string | undefined },
    apiHubConfig?: ApiHubConfig
): Promise<{ destinationName: string | undefined; servicePath: string | undefined }> {
    let destinationName: string | undefined;
    if (apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise) {
        // appGenDestination may not have been passed in options e.g. launched from app modeler
        if (!servicePath) {
            // Load service path from manifest.json file
            const manifest = await loadManifest(memFs, appPath);
            servicePath = manifest?.['sap.app'].dataSources?.mainService?.uri;
        }
        destinationName = generateDestinationName(API_BUSINESS_HUB_ENTERPRISE_PREFIX, servicePath);
    }
    return { destinationName, servicePath };
}

/**
 * Generate a list of targets i.e. CF | ABAP and order based on the project type i.e. library, CF, abap or CAP.
 *
 * @param memFs - reference to a mem-fs editor
 * @param projectPath - project path
 * @param isCap - is the target project a CAP project
 * @param hasMtaConfig - does the target project contain MTA Config
 * @param apiHubConfig - API Hub configuration
 * @param configFile - config file to read UI5 properties, default to ui5.yaml
 * @returns a list of Target options i.e. CF | ABAP
 */
export async function getSupportedTargets(
    memFs: Editor,
    projectPath: string,
    isCap = false,
    hasMtaConfig = false,
    apiHubConfig?: ApiHubConfig,
    configFile = FileName.Ui5Yaml
): Promise<Target[]> {
    const isApiHubEnt = apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise;
    const isProjectExtension = memFs.exists(join(projectPath, '.extconfig.json'));
    const ui5Config = await UI5Config.newInstance(memFs.read(join(projectPath, configFile)));
    if (isApiHubEnt || isCap) {
        return [cfChoice];
    } else if (ui5Config.getType() === DeployProjectType.Library || isProjectExtension) {
        return [abapChoice]; // Extension projects, Library and systems using Reentrance tickets for auth
    } else {
        // If there's an mta.yaml in the hierarchy, it's probably a CF project
        // Offer that first and let the user decide
        return hasMtaConfig ? [cfChoice, abapChoice] : [abapChoice, cfChoice];
    }
}
