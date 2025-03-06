import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';
import type { AbapServiceProvider, ServiceProvider, UiServiceGenerator } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { ServiceConfig, SystemSelectionAnswers } from '@sap-ux/ui-service-inquirer';
import type { ProviderSystem, ServiceConnectivityData } from '@sap/service-provider-apis';
import { ProviderType } from '@sap/service-provider-apis';
import type { Editor } from 'mem-fs-editor';
import { basename, dirname, join } from 'path';
import { t } from '../utils/i18n';
import UiServiceGenLogger from '../utils/logger';
import type { AppGenData, AppGenSystemSystemData, PromptOptions, ReqAuth } from './types';
import { type VSCodeInstance } from '@sap-ux/fiori-generator-shared';

export async function generateService(
    objectGeneator: UiServiceGenerator,
    content: string,
    transportReqNumber: string,
    appWizard: AppWizard
): Promise<unknown> {
    return await objectGeneator.generate(content, transportReqNumber).catch((error: any) => {
        appWizard.showError(`${t('ERROR_GENERATING_SERVICE')}`, MessageType.notification);
        UiServiceGenLogger.logger.error(`Error generating service: ${error.message}`);
        UiServiceGenLogger.logger.error(`${error.code} ${error.response?.status} ${error.response?.data}`);

        // TelemetryHelper.createTelemetryData({
        //     ErrorMessage: error.message,
        //     ErrorCode: error.code,
        //     ResponseStatus: error.response?.status
        // });
        // sendTelemetry(SERVICE_GENERATION_FAIL, TelemetryHelper.telemetryData);
    });
}

export async function writeBASMetadata(
    serviceConfig: ServiceConfig,
    fs: Editor,
    appWizard: AppWizard,
    inputData: PromptOptions,
    provider: ServiceProvider
): Promise<void> {
    const relativeURL = getRelativeUrlFromContent(serviceConfig.content);
    let metadata = await getMetadata(relativeURL, provider);

    if (!metadata) {
        // wait for 5 seconds and try again
        await new Promise((resolve) => setTimeout(resolve, 5000));
        metadata = await getMetadata(relativeURL, provider, true);
    }
    if (metadata) {
        const serviceMetadataContent = getServiceMedadataContent(
            inputData.providerSystem!,
            relativeURL,
            metadata,
            JSON.parse(serviceConfig.content)
        );
        // path was already validated in calling function
        fs.writeJSON(join(inputData.path!, '.service.metadata'), serviceMetadataContent);
        appWizard.showInformation(
            t('INFO_GENERATION_SUCCESSFUL_WRITE_FILE', { serviceName: serviceConfig.serviceName }),
            MessageType.notification
        );
        // UiServiceGenLogger.logger.info(
        //     t('INFO_GENERATION_SUCCESSFUL_WRITE_FILE', { serviceName: state.suggestedServiceName })
        // );
    } else {
        appWizard.showInformation(
            t('INFO_GENERATION_SUCCESSFUL_METADATA_FAIL', { serviceName: serviceConfig.serviceName }),
            MessageType.notification
        );
        // UiServiceGenLogger.logger.info(
        //     t('INFO_GENERATION_SUCCESSFUL_METADATA_FAIL', { serviceName: state.suggestedServiceName })
        // );
    }
}

export function getRelativeUrlFromContent(content: string): string {
    const contentJson = JSON.parse(content);
    return `/sap/opu/odata4/sap/${contentJson.businessService.serviceBinding.serviceBindingName}/srvd/sap/${contentJson.businessService.serviceDefinition.serviceDefinitionName}/0001/`;
}

export async function getMetadata(relativeURL: string, provider: ServiceProvider, retry = false): Promise<string> {
    return await provider
        .get(`${relativeURL}/$metadata`)
        .then((res: any) => {
            return res.data;
        })
        .catch(() => {
            if (retry) {
                //UiServiceGenLogger.logger.error(`Error fetching metadata for generated service: ${error.message}`);
            }
            return '';
        });
}

export function getServiceMedadataContent(
    providerSystem: ProviderSystem,
    relativeURL: string,
    metadata: string,
    contentJson: any
): ServiceConnectivityData {
    return {
        providerSystem: providerSystem,
        relativeURL: relativeURL,
        metadata: {
            odataContent: metadata
        },
        serviceName: contentJson.businessService.serviceBinding.serviceBindingName,
        providerType: ProviderType.SapSystem
    };
}

export async function runPostGenHook(
    vscodeInstance: VSCodeInstance,
    systemData: AppGenSystemSystemData,
    content: string,
    provider: ServiceProvider,
    targetPath?: string
): Promise<void> {
    const relativeUrl = getRelativeUrlFromContent(content);
    const appGenData: AppGenData = {
        type: 'SERVICE_GEN_DATA',
        system: systemData,
        service: {
            url: relativeUrl,
            metadata: await getMetadata(relativeUrl, provider)
        }
    };

    if (targetPath) {
        Object.assign(appGenData, {
            project: {
                targetPath: dirname(targetPath),
                name: basename(targetPath)
            }
        });
    }

    setTimeout(() => {
        vscodeInstance?.commands
            ?.executeCommand?.('sap.ux.service.generated.handler', appGenData)
            .catch((error: any) => {
                UiServiceGenLogger.logger.error(`Error executing command: ${error.message}`);
            });
    }, 500);
}

export function getAppGenSystemData(system: SystemSelectionAnswers): AppGenSystemSystemData {
    return isAppStudio()
        ? { destination: system.connectedSystem?.destination?.Name ?? '' }
        : {
              name: system.connectedSystem?.backendSystem?.name ?? '',
              url: system.connectedSystem?.backendSystem?.url ?? '',
              client: system.connectedSystem?.backendSystem?.client ?? ''
          };
}

export async function authenticateInputData(data: PromptOptions, system: SystemSelectionAnswers): Promise<void> {
    const reqAuth = data.user && data.password ? { username: data.user, password: data.password } : undefined;
    await validateConnection(data.systemName, system, reqAuth);
    // Object.assign(system, {
    //     connectedSystem: {
    //         serviceProvider: system.provider
    //     }
    // });
}

// /**
//  * Validates the connection to the BAS destination
//  * @param system - SAP system
//  * @param state - UI service state
//  * @param reqAuth - request authentication
//  * @returns boolean
//  */
export async function validateConnection(
    systemName: string,
    system: SystemSelectionAnswers,
    reqAuth?: ReqAuth
): Promise<void> {
    const target: AbapTarget = {
        destination: systemName
    };
    const provider = (await createAbapServiceProvider(
        target,
        { ignoreCertErrors: true, auth: reqAuth },
        false,
        UiServiceGenLogger.logger as unknown as Logger
    )) as unknown as AbapServiceProvider;
    try {
        await checkConnection(provider);
        Object.assign(system, {
            connectedSystem: {
                serviceProvider: provider,
                destination: {
                    Name: systemName
                }
            }
        });
        return;
    } catch (e) {
        // Review if this is still needed for BAS flow
        if (isAppStudio() && JSON.stringify(e) === '{}') {
            //state.authenticated = true;
        } else {
            //UiServiceGenLogger.logger.error(t('ERROR_CONNECTION_FAILED', { system: systemName }));
            return;
        }
    }
}

export async function checkConnection(provider: AbapServiceProvider): Promise<boolean> {
    try {
        await provider.get('/sap/bc/adt/discovery', {
            headers: {
                Accept: 'application/atomsvc+xml'
            }
        });
        return true;
    } catch {
        return false;
    }
}

export function setToolbarMessage(
    options: PromptOptions,
    systemSelectionAnswers: SystemSelectionAnswers,
    appWizard: AppWizard
): void {
    if (options && !systemSelectionAnswers.connectedSystem?.serviceProvider) {
        // Could not authenticate with the system provided in the input data
        appWizard.showError(t('ERROR_AUTHENTICATION'), MessageType.prompt);
    } else if (options && !systemSelectionAnswers.objectGenerator) {
        // Could not fetch the generator for the business object provided in the input data
        appWizard.showError(t('NO_GENERATOR_FOUND_BO'), MessageType.prompt);
    } else {
        appWizard.showWarning(t('INFO_GENERATION_WARNING'), MessageType.prompt);
    }
}

// export function addToCache(appWizard: AppWizard, answers: UiServiceAnswers): void {
//     if (appWizard[UI_SERVICE_CACHE]) {
//         Object.assign(appWizard[UI_SERVICE_CACHE], {
//             systemName: answers.sapSystem,
//             objectType: answers.objectType,
//             businessObjectInterface: answers.businessObjectInterface,
//             abapCDSView: answers.abapCDSView
//         });
//     }
// }

// export function getFromCache(appWizard: AppWizard) {
//     if (appWizard[UI_SERVICE_CACHE].systemName) {
//         return {
//             systemName: appWizard[UI_SERVICE_CACHE].systemName,
//             objectType: appWizard[UI_SERVICE_CACHE].objectType,
//             businessObjectInterface: appWizard[UI_SERVICE_CACHE].businessObjectInterface,
//             abapCDSView: appWizard[UI_SERVICE_CACHE].abapCDSView
//         };
//     }
// }
