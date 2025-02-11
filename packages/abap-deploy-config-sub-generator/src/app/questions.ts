import { getPrompts } from '@sap-ux/abap-deploy-config-inquirer';
import { FileName, readUi5Yaml } from '@sap-ux/project-access';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { isAppStudio } from '@sap-ux/btp-utils';
import { ABAP_DEPLOY_TASK } from '../utils/constants';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { AbapDeployConfigAnswersInternal, AbapDeployConfigQuestion } from '@sap-ux/abap-deploy-config-inquirer';
import type { AbapDeployConfig, AbapTarget, BspApp, FioriToolsProxyConfigBackend } from '@sap-ux/ui5-config';
import type { ConnectedSystem } from '@sap-ux/deploy-config-generator-shared';
import type { Logger } from '@sap-ux/logger';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';
import { DeployProjectType, type AbapDeployConfigPromptOptions } from './types';

/**
 * Get the ABAP target based on the provided parameters.
 *
 * @param destination - the destination used during app generation
 * @param backendSystem - the backend system used during app generation
 * @param existingAbapDeployTask - possible existing deploy configuration (ui5-deploy.yaml)
 * @param backendConfig - the existing base configuration (ui5.yaml)
 * @returns - the ABAP target
 */
function getAbapTarget(
    destination?: Destination,
    backendSystem?: BackendSystem,
    existingAbapDeployTask?: AbapDeployConfig,
    backendConfig?: FioriToolsProxyConfigBackend
): AbapTarget {
    let url, scp, client, destinationName, authenticationType;

    if (isAppStudio() && destination) {
        // the destination used during app generation
        destinationName = destination.Name;
    } else if (backendSystem) {
        // the backend system used during app generation
        url = backendSystem.url;
        client = backendSystem.client;
        scp = !!backendSystem.serviceKeys;
        authenticationType = backendSystem.authenticationType;
    } else if (existingAbapDeployTask?.target) {
        // possible existing deploy configuration (ui5-deploy.yaml)
        url = existingAbapDeployTask.target.url;
        client = existingAbapDeployTask.target.client;
        scp = existingAbapDeployTask.target.scp;
        authenticationType = existingAbapDeployTask.target.authenticationType;
        destinationName = existingAbapDeployTask.target.destination;
    } else if (backendConfig) {
        // the existing base configuration (ui5.yaml)
        url = backendConfig.url;
        scp = backendConfig.scp;
        client = backendConfig.client;
        authenticationType = backendConfig.authenticationType;
        destinationName = backendConfig?.destination;
    }

    return {
        url,
        scp,
        client: client || '', // Needs to default to empty string
        destination: destinationName,
        authenticationType
    } as AbapTarget;
}

/**
 * Retrieves the ABAP prompt questions from the inquirer.
 *
 * @param params - the parameters required for retrieving the questions
 * @param params.appRootPath - the path to the app
 * @param params.connectedSystem - the connected system
 * @param params.backendConfig - the backend configuration
 * @param params.configFile - the deployment configuration file name
 * @param params.indexGenerationAllowed - whether index generation is allowed
 * @param params.showOverwriteQuestion - whether the overwrite question should be shown
 * @param params.projectType - the project type
 * @param params.logger - the logger
 * @param params.promptOptions - A set of optional feature flags to prompts behavior.
 * @returns - the prompts and answers
 */
export async function getAbapQuestions({
    appRootPath,
    connectedSystem,
    backendConfig,
    configFile = FileName.UI5DeployYaml,
    indexGenerationAllowed = false,
    showOverwriteQuestion = false,
    projectType = DeployProjectType.Application,
    promptOptions = {},
    logger
}: {
    appRootPath: string;
    connectedSystem?: ConnectedSystem;
    backendConfig?: FioriToolsProxyConfigBackend;
    configFile?: string;
    indexGenerationAllowed?: boolean;
    showOverwriteQuestion?: boolean;
    projectType?: DeployProjectType;
    promptOptions?: AbapDeployConfigPromptOptions;
    logger?: ILogWrapper;
}): Promise<{ prompts: AbapDeployConfigQuestion[]; answers: Partial<AbapDeployConfigAnswersInternal> }> {
    const { backendSystem, serviceProvider, destination } = connectedSystem || {};
    let existingAbapDeployTask: AbapDeployConfig | undefined;
    try {
        const ui5DeployConfig = await readUi5Yaml(appRootPath, configFile);
        existingAbapDeployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;
    } catch {
        // not an issue if the file does not exist
    }
    const abapTarget = getAbapTarget(destination, backendSystem, existingAbapDeployTask, backendConfig);
    const deployAppConfig = existingAbapDeployTask?.app as BspApp;

    logger?.debug(
        `Retrieve ABAP prompts using: \n App path: ${appRootPath}, 
        ABAPTarget: ${JSON.stringify(abapTarget)}, SystemName: ${backendSystem?.name}, 
        ServiceProvider: ${!!serviceProvider}, showOverwriteQuestion ${showOverwriteQuestion}, indexGenerationAllowed ${indexGenerationAllowed}`
    );

    return getPrompts(
        {
            backendTarget: {
                abapTarget,
                systemName: backendSystem?.name,
                serviceProvider,
                type: projectType
            },
            ui5AbapRepo: {
                default: deployAppConfig?.name,
                hideIfOnPremise: promptOptions?.ui5AbapRepo?.hideIfOnPremise ?? false
            },
            description: { default: deployAppConfig?.description },
            packageManual: {
                default: deployAppConfig?.package,
                additionalValidation: {
                    shouldValidatePackageType: promptOptions?.packageAutocomplete?.shouldValidatePackageType ?? false,
                    shouldValidatePackageForStartingPrefix:
                        promptOptions?.packageAutocomplete?.shouldValidatePackageForStartingPrefix ?? false
                }
            },
            transportManual: { default: deployAppConfig?.transport },
            index: { indexGenerationAllowed },
            packageAutocomplete: {
                useAutocomplete: true,
                additionalValidation: {
                    shouldValidatePackageType: promptOptions?.packageAutocomplete?.shouldValidatePackageType ?? false,
                    shouldValidatePackageForStartingPrefix:
                        promptOptions?.packageAutocomplete?.shouldValidatePackageForStartingPrefix ?? false
                }
            },
            overwrite: { hide: !showOverwriteQuestion },
            transportInputChoice: { hideIfOnPremise: promptOptions?.transportInputChoice?.hideIfOnPremise ?? false }
        },
        logger as unknown as Logger,
        getHostEnvironment() !== hostEnvironment.cli
    );
}
