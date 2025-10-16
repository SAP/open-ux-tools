import { MessageType, type AppWizard } from '@sap-devx/yeoman-ui-types';
import type { AbapServiceProvider, ServiceProvider, UiServiceGenerator } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { sendTelemetry, TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import type { Logger } from '@sap-ux/logger';
import type { AbapTarget } from '@sap-ux/system-access';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { ServiceConfig, SystemSelectionAnswers, UiServiceAnswers } from '@sap-ux/ui-service-inquirer';
import type { ProviderSystem, ServiceConnectivityData } from '@sap/service-provider-apis';
import { ProviderType } from '@sap/service-provider-apis';
import type { Editor } from 'mem-fs-editor';
import { basename, dirname, join } from 'node:path';
import type { GeneratorOptions } from 'yeoman-generator';
import { SAP_NAMESPACE, SERVICE_GENERATION_FAIL, UI_SERVICE_CACHE } from '../utils';
import { t } from '../utils/i18n';
import UiServiceGenLogger from '../utils/logger';
import type { AppGenData, AppGenSystemSystemData, PromptOptions, ReqAuth } from './types';

/**
 * Generate the service.
 *
 * @param objectGeneator - the backend object generator for the object type
 * @param content - the suggested content used to generate the service
 * @param transportReqNumber - the transport request number
 * @param appWizard - the app wizard reference
 * @returns the generated service response
 */
export async function generateService(
    objectGeneator: UiServiceGenerator,
    content: string,
    transportReqNumber: string,
    appWizard: AppWizard
): Promise<unknown> {
    return await objectGeneator.generate(content, transportReqNumber).catch((error: any) => {
        appWizard.showError(`${t('error.generatingService')}`, MessageType.notification);
        UiServiceGenLogger.logger.error(`Error generating service: ${error.message}`);
        UiServiceGenLogger.logger.error(`${error.code} ${error.response?.status} ${error.response?.data}`);
        UiServiceGenLogger.logger?.error(JSON.stringify(error, null, 2));
        UiServiceGenLogger.logger?.error(JSON.stringify(error.response, null, 2));

        TelemetryHelper.createTelemetryData({
            ErrorMessage: error.message,
            ErrorCode: error.code,
            ResponseStatus: error.response?.status
        });
        sendTelemetry(SERVICE_GENERATION_FAIL, TelemetryHelper.telemetryData).catch((error: any) => {
            UiServiceGenLogger.logger.error(`Error sending telemetry: ${error.message}`);
        });
    });
}

/**
 * Write the service metadata file into the BAS Storyboard project.
 *
 * @param serviceConfig - the service name and content object
 * @param fs - the file system
 * @param appWizard - the app wizard reference
 * @param inputData - the input data provider to the service generator from BAS
 * @param provider - the service provider
 */
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
            inputData.providerSystem as ProviderSystem,
            relativeURL,
            metadata,
            JSON.parse(serviceConfig.content)
        );
        // path was already validated in calling function
        fs.writeJSON(join(inputData.path!, '.service.metadata'), serviceMetadataContent);
        appWizard.showInformation(
            t('info.generationSuccessfulWriteFile', { serviceName: serviceConfig.serviceName }),
            MessageType.notification
        );
        UiServiceGenLogger.logger.info(
            t('info.generationSuccessfulWriteFile', { serviceName: serviceConfig.serviceName })
        );
    } else {
        appWizard.showInformation(
            t('info.generationSuccessfulMetadataFail', { serviceName: serviceConfig.serviceName }),
            MessageType.notification
        );
        UiServiceGenLogger.logger.info(
            t('info.generationSuccessfulMetadataFail', { serviceName: serviceConfig.serviceName })
        );
    }
}

/**
 * Get the relative URL from the service content.
 *
 * @param content - the suggested service content
 * @returns the relative odata service URL
 */
export function getRelativeUrlFromContent(content: string): string {
    const contentJson = JSON.parse(content);
    let serviceBinding = contentJson?.businessService?.serviceBinding?.serviceBindingName?.replace(/^\/|\/$/g, '');
    let serviceDefinitionName = contentJson?.businessService?.serviceDefinition?.serviceDefinitionName?.replace(
        /^\/|\/$/g,
        ''
    );
    if (!contentJson.general?.namespace?.startsWith('/')) {
        serviceBinding = `${SAP_NAMESPACE}/${serviceBinding}`;
        serviceDefinitionName = `${SAP_NAMESPACE}/${serviceDefinitionName}`;
    }
    return `/sap/opu/odata4/${serviceBinding}/srvd/${serviceDefinitionName}/0001/`;
}

/**
 * Get the metadata for the service url provided. Has a 5 second retry if the metadata is not fetched on first attempt.
 *
 * @param relativeURL - the relative URL of the service
 * @param provider - the service provider
 * @param retry - whether retry should be attempted
 * @returns the service metadata content as string
 */
export async function getMetadata(relativeURL: string, provider: ServiceProvider, retry = false): Promise<string> {
    return await provider
        .get(`${relativeURL}/$metadata`)
        .then((res: any) => {
            return res.data;
        })
        .catch((error) => {
            if (retry) {
                UiServiceGenLogger.logger.error(`Error fetching metadata for generated service: ${error.message}`);
            }
            return '';
        });
}

/**
 * Get the service metadata content to be written to the .service.metadata file.
 *
 * @param providerSystem - the provider system
 * @param relativeURL - the relative URL of the service
 * @param metadata - the metadata content
 * @param contentJson - the suggested service content as JSON
 * @returns the service connectivity data object in form of .service.metadata file
 */
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

/**
 * Run the post generation hook to open the application generator via command with specific payload.
 *
 * @param options - options passed to the generator
 * @param systemData - the system data
 * @param content - the suggested service content
 * @param provider - the service provider
 */
export async function runPostGenHook(
    options: GeneratorOptions,
    systemData: AppGenSystemSystemData,
    content: string,
    provider: ServiceProvider
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

    if (options.data?.path) {
        Object.assign(appGenData, {
            project: {
                targetPath: dirname(options.data?.path),
                name: basename(options.data?.path)
            }
        });
    }

    UiServiceGenLogger.logger.info(
        `Launching App Generator with data: ${JSON.stringify(appGenData)} and command ${
            options.data?.appGenLaunchCommand
        }`
    );
    setTimeout(() => {
        options.vscode?.commands?.executeCommand?.(
            options.data?.appGenLaunchCommand ?? 'sap.ux.service.generated.handler',
            appGenData
        );
    }, 500);
}

/**
 * Get the system data for the application generator.
 *
 * @param system - the system selection answers
 * @returns the system data to be passed to the application generator
 */
export function getAppGenSystemData(system: SystemSelectionAnswers): AppGenSystemSystemData {
    return isAppStudio()
        ? { destination: system.connectedSystem?.destination?.Name ?? '' }
        : {
              name: system.connectedSystem?.backendSystem?.name ?? '',
              url: system.connectedSystem?.backendSystem?.url ?? '',
              client: system.connectedSystem?.backendSystem?.client ?? ''
          };
}

/**
 * Authenticate the auth input data provided by BAS Service Center.
 *
 * @param data - the input data from BAS Service Center
 * @param system - the system selection answers
 */
export async function authenticateInputData(data: PromptOptions, system: SystemSelectionAnswers): Promise<void> {
    const reqAuth = data.user && data.password ? { username: data.user, password: data.password } : undefined;
    await validateConnection(data.systemName, system, reqAuth);
}

/**
 * Validate the connection to the system.
 *
 * @param systemName - the system name
 * @param system - the system selection answers
 * @param reqAuth - the auth, user and password, provided by BAS Service Center
 */
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
        UiServiceGenLogger.logger.error(t('error.connectionFailed', { system: systemName }));
        return;
    }
}

/**
 * Check the connection to the system.
 *
 * @param provider - the service provider
 * @returns whether the connection is successful
 */
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

/**
 * Set the Yeoman UI (AppWizard) toolbar message based on the input data.
 *
 * @param data - the prompt options passed in from BAS Service Center
 * @param systemSelectionAnswers - the system selection answers
 * @param appWizard - the app wizard reference
 */
export function setToolbarMessage(
    data: PromptOptions,
    systemSelectionAnswers: SystemSelectionAnswers,
    appWizard: AppWizard
): void {
    if (data?.systemName && !systemSelectionAnswers.connectedSystem?.serviceProvider) {
        // Could not authenticate with the system provided in the input data
        appWizard.showError(t('error.authentication'), MessageType.prompt);
    } else if (data?.systemName && !systemSelectionAnswers.objectGenerator) {
        // Could not fetch the generator for the business object provided in the input data
        appWizard.showError(t('error.noGeneratorFoundBo'), MessageType.prompt);
    } else {
        appWizard.showWarning(t('info.generationWarning'), MessageType.prompt);
    }
}

/**
 * Add the system selection and object answers to the cache.
 *
 * @param appWizard - the app wizard reference
 * @param systemSelectionAnswers - the system selection answers
 * @param objectAnswers - the remaining prompt answers from system selection step
 */
export function addToCache(
    appWizard: AppWizard,
    systemSelectionAnswers: SystemSelectionAnswers,
    objectAnswers: UiServiceAnswers
): void {
    if ((appWizard as any)[UI_SERVICE_CACHE]) {
        Object.assign((appWizard as any)[UI_SERVICE_CACHE], {
            systemSelectionAnswers: objectAnswers,
            systemName:
                systemSelectionAnswers.connectedSystem?.destination?.Name ??
                systemSelectionAnswers.connectedSystem?.backendSystem?.name
        });
    }
}

/**
 * Get the system selection answers and system name from the cache.
 *
 * @param appWizard - the app wizard reference
 * @returns the system selection answers and system name
 */
export function getFromCache(appWizard: AppWizard): [UiServiceAnswers, string] {
    return [
        (appWizard as any)[UI_SERVICE_CACHE].systemSelectionAnswers,
        (appWizard as any)[UI_SERVICE_CACHE].systemName
    ];
}
