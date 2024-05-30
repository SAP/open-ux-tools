import { isAppStudio } from '@sap-ux/btp-utils';
import { UI5Config } from '@sap-ux/ui5-config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

/**
 * Import with Tree shaking behaviour '@sap/ux-project-access/dist/project/utils'
 * performance optimization to remove unreachable code automatically from esbuild.
 * Esbuild will only bundle parts of your packages that you actually use
 *
 * Note: Without Tree shaking import '@sap/ux-project-access'
 * packages consuming telemetry need to add dependencies manually (for ex: sap/cds)
 * Further, size of generated .vsix will be increased by esbuild
 */
import { getAppProgrammingLanguage, getProjectType, getAppType } from '@sap-ux/project-access/dist/project/info';
import { findProjectRoot } from '@sap-ux/project-access/dist/project/search';
import { isCapJavaProject } from '@sap-ux/project-access/dist/project/cap';
import type { ProjectType } from '@sap-ux/project-access/dist/types';
import type { CommonFioriProjectProperties, InternalFeature, SourceTemplate } from './types';
import { ODataSource, DeployTarget, CommonProperties, ToolsId } from './types';
import { spawn } from 'child_process';
import os from 'os';
import type { CustomTask } from '@sap-ux/ui5-config';
import { ToolingTelemetrySettings } from './config-state';

/**
 * Collect commone properties that needs to be added to telemetry event.
 *
 * @param telemetryHelperProperties Pass to report ApplicationInsightClient.report()
 * @returns Common Fiori project properties
 */
export async function processToolsSuiteTelemetry(
    telemetryHelperProperties: Record<string, string> | undefined
): Promise<CommonFioriProjectProperties> {
    const commonProperties = await getCommonProperties();

    let appProperties = {} as Record<string, string>;
    if (telemetryHelperProperties) {
        appProperties = await getAppProperties(telemetryHelperProperties['appPath']);
    }

    return { ...commonProperties, ...appProperties };
}

/**
 * Get common properties that related to Fiori project runtime environment.
 *
 * @returns Common properties
 */
export async function getCommonProperties(): Promise<CommonFioriProjectProperties> {
    const commonProperties = {} as CommonFioriProjectProperties;
    commonProperties[CommonProperties.DevSpace] = await getSbasDevspace();
    commonProperties[CommonProperties.AppStudio] = isAppStudio();
    commonProperties[CommonProperties.AppStudioBackwardCompatible] = commonProperties[CommonProperties.AppStudio];
    commonProperties[CommonProperties.InternlVsExternal] = getInternalVsExternal();
    commonProperties[CommonProperties.InternlVsExternalBackwardCompatible] =
        commonProperties[CommonProperties.InternlVsExternal];

    commonProperties[CommonProperties.NodeVersion] = (await getProcessVersions()).node;
    return commonProperties;
}

/**
 * Obtain dev space type from SBAS rest api.
 *
 * @returns SBAS Dev Space Name. Empty string is returned if unable to fetch workspace type or the environment is not SBAS
 */
async function getSbasDevspace(): Promise<string> {
    if (isAppStudio()) {
        try {
            if (!process.env.H2O_URL || !process.env.WORKSPACE_ID) {
                return '';
            }
            const h20Url = process.env.H2O_URL;
            const workspaceId = process.env.WORKSPACE_ID.replace('workspaces-', '');
            const url = `${h20Url}/ws-manager/api/v1/workspace/${workspaceId}`;

            const response = await axios.get(url);
            if (response.data) {
                const workspaceConfig = response.data;
                // devspace stored in this path
                return workspaceConfig?.config?.annotations?.pack;
            }
        } catch (error) {
            // handling error
        }
    }
    return '';
}

/**
 * Get common properties from a give Fiori project path.
 *
 * @param appPath Fiori project path.
 * @returns Properties to be append to properties in telemetry event
 */
async function getAppProperties(appPath: string): Promise<Record<string, string>> {
    if (!appPath) {
        return {};
    }

    const templateType = await getTemplateType(appPath);
    const deployTarget = await getDeployTarget(appPath);
    const applicationType = await getAppType(appPath);
    let odataSource = await getODataSource(appPath);
    // Correct logic in getAppType() implementation, if it's reuse lib type, odata source should be unknown
    if (applicationType === 'Fiori Reuse') {
        odataSource = ODataSource.UNKNOWN;
    }
    const sourceTemplate = await getSourceTemplate(appPath);
    const appProgrammingLanguage = await getAppProgrammingLanguage(appPath);
    const output: Record<string, string> = {};
    output[CommonProperties.TemplateType] = templateType;
    output[CommonProperties.DeployTargetType] = deployTarget;
    output[CommonProperties.ODataSourceType] = odataSource;
    output[CommonProperties.AppToolsId] = sourceTemplate.toolsId ?? '';
    output[CommonProperties.AppProgrammingLanguage] = appProgrammingLanguage;
    output[CommonProperties.TemplateId] = sourceTemplate.id ?? '';
    output[CommonProperties.TemplateVersion] = sourceTemplate.version ?? '';
    output[CommonProperties.ApplicationType] = applicationType ?? '';

    return output;
}

/**
 * Read template type from README.md of an Fiori app. This will be improved once we have the floor
 * plan information added to e.g. manifest.json of generated app.
 *
 * @param appPath Root folder path of Fiori app
 * @returns Template type used in the Fiori app
 */
async function getTemplateType(appPath: string): Promise<string> {
    const readmeFilePath = path.join(appPath, 'README.md');
    if (fs.existsSync(readmeFilePath)) {
        const readmeContent = await fs.promises.readFile(readmeFilePath, 'utf-8');
        if (readmeContent) {
            let templateType = '';
            const lines = readmeContent.split(/\r?\n/);
            for (const line of lines) {
                // Check if the line matches the pattern |**Template Used**<br>{{TemplateType}}|
                const regex = /\|\*\*Template Used\*\*<br>(.*?)\|/;
                const match = regex.exec(line);
                if (match && match.length >= 2) {
                    // Extract {{TemplateType}} from the matching pattern
                    templateType = match[1].trim();
                    break;
                }
            }
            return templateType;
        }
    }
    return '';
}

/**
 * Find OData Source type of a given app folder path.
 *
 * @param appPath Root folder path of Fiori app
 * @returns Project Type ABAP | CAPJava | CAPNode | UNKNOWN
 */
async function getODataSource(appPath: string): Promise<string> {
    try {
        // First attempt: Loop up a folder that contain a pacakge.json that has sapux property as project root
        // If appPath has package.json that contains sapux, it is EDMX project type and we derive odata source
        // is ABAP.
        let projectRoot: string | undefined;
        try {
            projectRoot = await findProjectRoot(appPath);
        } catch {
            // No project root can be found
        }

        // Second attempt: For FF app, package.json does not have sapux property. Try to find the
        // first parent folder that contain pacakge.json as CAP root. If no such folder exists,
        // use appPath as project root.
        if (!projectRoot) {
            try {
                const appParentFolder = path.dirname(appPath);
                projectRoot = await findProjectRoot(appParentFolder, false);
            } catch (e) {
                // No project root can be found at parent folder.
            }
        }

        // Third attempt: CAPJava that doesn't have package.json at project root. We assume
        // the project has default structure <projectRoot>/app/<appPath>, and use parent folder
        // path two levels above appPath as projectRoot. This should cover most cases until we have
        // a better solution
        let isCapJavaWithoutPackageJson = false;
        if (!projectRoot) {
            const directParentFolder = path.dirname(appPath);
            const twoLevelUpParentFolder = path.dirname(directParentFolder);
            isCapJavaWithoutPackageJson = await isCapJavaProject(twoLevelUpParentFolder);
            projectRoot = isCapJavaWithoutPackageJson ? twoLevelUpParentFolder : appPath;
        }

        if (isCapJavaWithoutPackageJson) {
            return ODataSource.CAPJava;
        }
        const projectType = await getProjectType(projectRoot);
        return getProjectTypeForTelemetry(projectType);
    } catch (e) {
        return ODataSource.UNKNOWN;
    }
}

/**
 * Map ProjectType to values used for telemetry reporting.
 *
 * @param projectType ProjectType
 * @returns Odata source type
 */
function getProjectTypeForTelemetry(projectType: ProjectType): ODataSource {
    if (projectType === 'EDMXBackend') {
        return ODataSource.ABAP;
    } else if (projectType === 'CAPNodejs') {
        return ODataSource.CAPNode;
    } else if (projectType === 'CAPJava') {
        return ODataSource.CAPJava;
    } else {
        return ODataSource.UNKNOWN;
    }
}

/**
 * Read ui5-deploy.yaml to decide if it is CF or ABAP deploy target.
 *
 * @param appPath  appPath Root folder path of Fiori app
 * @returns CF | ABAP | NO_DEPLOY_CONFIG | UNKNOWN_DEPLOY_CONFIG
 */
async function getDeployTarget(appPath: string): Promise<string> {
    let deployTarget = DeployTarget.NO_DEPLOY_CONFIG;
    const deployConfigPath = path.join(appPath, 'ui5-deploy.yaml');

    try {
        await fs.promises.access(deployConfigPath);
        const deployConfigContent = await fs.promises.readFile(deployConfigPath, 'utf-8');
        const deployConfig = yaml.parse(deployConfigContent);
        const customTasks = deployConfig?.builder?.customTasks;

        if (customTasks) {
            const isAbapDeployTarget = customTasks.some((task: CustomTask<unknown>) => task.name === 'deploy-to-abap');
            deployTarget = isAbapDeployTarget ? DeployTarget.ABAP : DeployTarget.CF;
        } else {
            deployTarget = DeployTarget.UNKNOWN_DEPLOY_CONFIG;
        }
    } catch {
        // cannot determine deploy target, use default DeployTarget.NO_DEPLOY_CONFIG
    }

    return deployTarget;
}

/**
 * Convert init setting property internalFeaturesEnabled to string value.
 *
 * @returns String value 'internal' | 'external' to be backward compatible with existing telemetry data format.
 */
function getInternalVsExternal(): InternalFeature {
    return ToolingTelemetrySettings.internalFeature ? 'internal' : 'external';
}

/**
 * Retrieves the source template configuration from either the standard manifest.json or
 * the ui5.yaml based on the project type.
 *
 * @param {string} appPath - The file system path to the application directory.
 * @returns {Promise<SourceTemplate>} A promise that resolves to the source template configuration object.
 */
async function getSourceTemplate(appPath: string): Promise<SourceTemplate> {
    const paths = {
        manifest: path.join(appPath, 'webapp', 'manifest.json'),
        appdescr: path.join(appPath, 'webapp', 'manifest.appdescr_variant'),
        ui5Yaml: path.join(appPath, 'ui5.yaml')
    };

    try {
        if (fs.existsSync(paths.manifest)) {
            const manifestStr = await fs.promises.readFile(paths.manifest, 'utf-8');
            const manifest = JSON.parse(manifestStr);
            return populateSourceTemplate(manifest['sap.app']?.sourceTemplate ?? {});
        }

        if (fs.existsSync(paths.appdescr) && fs.existsSync(paths.ui5Yaml)) {
            const baseUi5ConfigContent = await fs.promises.readFile(paths.ui5Yaml, 'utf-8');
            const ui5Config = await UI5Config.newInstance(baseUi5ConfigContent);
            const adp = ui5Config.getCustomConfiguration('adp') as { support: SourceTemplate };
            return populateSourceTemplate(adp?.support ?? {});
        }
    } catch {
        // Failed to read manifest.json or manifest.appdescr_variant
    }

    return populateSourceTemplate({});
}

/**
 * Populates default values for the source template if not specified.
 *
 * @param {SourceTemplate} sourceTemplate - Source template object potentially lacking defaults.
 * @returns {SourceTemplate} Source template with defaults populated.
 */
function populateSourceTemplate(sourceTemplate: SourceTemplate): SourceTemplate {
    return {
        id: sourceTemplate.id ?? '',
        version: sourceTemplate.version ?? '',
        toolsId: sourceTemplate.toolsId ?? ToolsId.NO_TOOLS_ID
    };
}

/**
 * Get node.js runtime version.
 *
 * @returns Node.js version
 */
async function getProcessVersions(): Promise<NodeJS.ProcessVersions> {
    try {
        const output = await spawnCommand('node', ['-p', 'JSON.stringify(process.versions)']);
        return JSON.parse(output);
    } catch {
        return {} as NodeJS.ProcessVersions;
    }
}

/**
 * Spawn a command to find out node.js version used for the runtime.
 *
 * @param command command name
 * @param commandArgs command arguments
 * @returns Node.js version
 */
export function spawnCommand(command: string, commandArgs: string[]): Promise<string> {
    const spawnOptions = process.platform.startsWith('win')
        ? { windowsVerbatimArguments: true, shell: true, cwd: os.homedir() }
        : { cwd: os.homedir() };

    return new Promise((resolve, reject) => {
        let output = '';
        const spawnProcess = spawn(command, commandArgs, spawnOptions);
        spawnProcess.stdout.on('data', (data) => {
            const newData = data.toString();
            output += newData;
        });
        spawnProcess.stderr.on('data', (data) => {
            const newData = data.toString();
            output += newData;
        });
        spawnProcess.on('exit', () => {
            resolve(output);
        });
        spawnProcess.on('error', (error) => {
            reject(error);
        });
    });
}
