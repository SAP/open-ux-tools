import { join } from 'path';
import { defaultNavActionDisplay } from '../types';
import { getSemanticObject } from '@sap-ux/fiori-generator-shared';
import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { FlpConfigOptions, FLPConfigPromptOptions } from '@sap-ux/flp-config-sub-generator';
import type { Service, DeploySubGenPromptOptions } from '../types';

/**
 * Add the '@sap/fiori:fiori-deployment' generator as a subgenerator.
 *
 * @param deployGenOpts
 * @param deployGenOpts.service - service object
 * @param deployGenOpts.projectName - project name
 * @param deployGenOpts.targetFolder - target folder for the deployment configuration
 * @param deployGenOpts.applicationType - application type, used for telemetry (FF | FE)
 * @param composeWith - the composeWith function from the Yeoman generator
 * @param logger - logger instance
 * @param appWizard - instance of the AppWizard
 * @param promptSettings - prompt settings for the deployment generator
 */
export function addDeployGen(
    {
        service,
        projectName,
        targetFolder,
        applicationType
    }: {
        service: Partial<Service>;
        projectName: string;
        targetFolder: string;
        applicationType: string;
    },
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard,
    promptSettings?: DeploySubGenPromptOptions
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
        subGenPromptOptions: promptSettings
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
 * @param promptSettings - prompt settings for the flp generator used in the inquirer
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
    vscode?: any,
    promptSettings?: FLPConfigPromptOptions
): void {
    let flpConfigOptions = {
        launchFlpConfigAsSubGenerator: true,
        appWizard,
        vscode,
        appRootPath: join(targetFolder, projectName),
        logWrapper: logger,
        inquirerPromptOptions: promptSettings
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
