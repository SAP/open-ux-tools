import { DeployProjectType } from '@sap-ux/abap-deploy-config-sub-generator';
import { ApiHubConfig, ApiHubType } from '@sap-ux/cf-deploy-config-sub-generator';
import { FileName } from '@sap-ux/project-access';
import { UI5Config } from '@sap-ux/ui5-config';
import { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { Target } from '../types';
import { cfChoice, abapChoice } from './constants';

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
