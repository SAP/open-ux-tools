import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { FlpConfigOptions } from '@sap-ux/flp-config-sub-generator';
import { join } from 'path';
import type Generator from 'yeoman-generator';
import type { Service } from '../types';

/**
 * Add the '@sap/fiori:fiori-deployment' generator as a subgenerator.
 *
 * @param root0
 * @param root0.service
 * @param root0.projectName
 * @param root0.targetFolder
 * @param root0.applicationType
 * @param composeWith
 * @param logger
 * @param appWizard
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
        logWrapper: logger
    });
}

/**
 *
 * @param root0
 * @param root0.projectName
 * @param root0.targetFolder
 * @param composeWith
 * @param logger
 * @param appWizard
 * @param vscode
 */
export function addFlpGen(
    {
        projectName,
        targetFolder
    }: {
        projectName: string;
        targetFolder: string;
    },
    composeWith: Generator['composeWith'],
    logger: ILogWrapper,
    appWizard?: AppWizard,
    vscode?: any
): void {
    const flpConfigOptions = {
        launchFlpConfigAsSubGenerator: true,
        appWizard,
        vscode,
        appRootPath: join(targetFolder, projectName),
        logWrapper: logger
    } as FlpConfigOptions;

    composeWith('@sap/fiori:flp-config', flpConfigOptions);
}
