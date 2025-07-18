import { DeployProjectType } from '@sap-ux/abap-deploy-config-sub-generator';
import { ApiHubType } from '@sap-ux/cf-deploy-config-sub-generator';
import { FileName } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import { join } from 'path';
import { cfChoice, abapChoice } from './constants';
import type { Editor } from 'mem-fs-editor';
import type { Target } from '../types';
import type { ApiHubConfig } from '@sap-ux/cf-deploy-config-sub-generator';

/**
 * Generate a list of targets i.e. CF | ABAP and order based on the project type i.e. library, CF, abap or CAP.
 *
 * @param fs - reference to a mem-fs editor
 * @param projectPath - project path
 * @param isCap - is the target project a CAP project
 * @param hasMtaConfig - does the target project contain MTA Config
 * @param apiHubConfig - API Hub configuration
 * @param configFile - config file to read UI5 properties, default to ui5.yaml
 * @returns a list of Target options i.e. CF | ABAP
 */
export async function getSupportedTargets(
    fs: Editor,
    projectPath: string,
    isCap = false,
    hasMtaConfig = false,
    apiHubConfig?: ApiHubConfig,
    configFile = FileName.Ui5Yaml
): Promise<Target[]> {
    const isApiHubEnt = apiHubConfig?.apiHubType === ApiHubType.apiHubEnterprise;
    const isProjectExtension = fs.exists(join(projectPath, '.extconfig.json'));
    let isLibrary = false;
    try {
        const ui5Config = await UI5Config.newInstance(fs.read(join(projectPath, configFile)));
        isLibrary = ui5Config.getType() === DeployProjectType.Library;
    } catch {
        // Ignore error, ui5.yaml may not be written yet
    }

    if (isApiHubEnt || isCap) {
        return [cfChoice];
    } else if (isLibrary || isProjectExtension) {
        return [abapChoice]; // Extension projects, Library and systems using Reentrance tickets for auth
    } else {
        // If there's an mta.yaml in the hierarchy, it's probably a CF project
        // Offer that first and let the user decide
        return hasMtaConfig ? [cfChoice, abapChoice] : [abapChoice, cfChoice];
    }
}
