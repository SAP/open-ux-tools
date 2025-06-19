import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { type ILogWrapper, getSemanticObject } from '@sap-ux/fiori-generator-shared';
import type { FlpConfigOptions } from '@sap-ux/flp-config-sub-generator';
import { join } from 'path';
import type Generator from 'yeoman-generator';
import { defaultNavActionDisplay, type FioriAppGeneratorPromptSettings, type Service } from '../types';

/**
 * Add the '@sap/fiori:fiori-deployment' generator as a subgenerator.
 *
 * @param deployGenOpts
 * @param deployGenOpts.service - service object
 * @param deployGenOpts.projectName - project name
 * @param deployGenOpts.promptSettings - prompt settings for the deployment generator
 * @param deployGenOpts.targetFolder - target folder for the deployment configuration
 * @param deployGenOpts.applicationType - application type, used for telemetry (FF | FE)
 * @param composeWith - the composeWith function from the Yeoman generator
 * @param logger - logger instance
 * @param appWizard - instance of the AppWizard
 */
export function addDeployGen(
    {
        service,
        projectName,
        promptSettings,
        targetFolder,
        applicationType
    }: {
        service: Partial<Service>;
        projectName: string;
        promptSettings?: FioriAppGeneratorPromptSettings;
        targetFolder: string;
        applicationType: string;
    },
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard
): void {
    composeWith('@sap/fiori:deploy-config', {
        launchDeployConfigAsSubGenerator: true,
        appGenServiceHost: service.host,
        appGenServicePath: service.servicePath,
        appGenClient: service.client,
        connectedSystem: service.connectedSystem,
        apiHubConfig: service.apiHubConfig || undefined,
        appGenDestination: service.destinationName ?? service.connectedSystem?.destination?.Name,
        projectName: projectName,
        projectPath: targetFolder,
        appWizard: appWizard,
        telemetryData: { appType: applicationType },
        logWrapper: logger,
        subGenPromptOptions: promptSettings?.['@sap-ux/deploy-config-sub-generator']
    });
}

/**
 * Add the '@sap/fiori:flp-config' generator as a subgenerator using `composeWith`.
 * Skipping the prompting (`skipPrompt`) will still write the config, but not ask for any input.
 *
 * @param options
 * @param options.projectName
 * @param options.targetFolder
 * @param options.title
 * @param options.skipPrompt The FLP config prompt step will be skipped, but the config will still br written
 * @param composeWith
 * @param logger
 * @param appWizard
 * @param vscode
 */
export function addFlpGen(
    {
        projectName,
        targetFolder,
        title,
        skipPrompt
    }: {
        projectName: string;
        targetFolder: string;
        title: string;
        skipPrompt: boolean;
    },
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard,
    vscode?: any
): void {
    let flpConfigOptions = {
        launchFlpConfigAsSubGenerator: true,
        appWizard,
        vscode,
        appRootPath: join(targetFolder, projectName),
        logWrapper: logger
    } as FlpConfigOptions;

    if (skipPrompt) {
        flpConfigOptions = {
            ...flpConfigOptions,
            skipPrompt: true,
            inboundConfig: {
                semanticObject: getSemanticObject(projectName),
                action: defaultNavActionDisplay,
                title
            }
        };
    }
    composeWith('@sap/fiori:flp-config', flpConfigOptions);
}
