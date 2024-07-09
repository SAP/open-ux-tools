import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Annotations, AxiosRequestConfig, CatalogService, ServiceProvider } from '@sap-ux/axios-extension';
import { ODataVersion, ServiceType, create } from '@sap-ux/axios-extension';
import { searchChoices, withCondition, type ListQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateClient } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListChoiceOptions, PasswordQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { ServiceSelectionPromptOptions, ValidationLink } from '../../../../types';
import { hostEnvironment, promptNames, type OdataServiceAnswers } from '../../../../types';
import { PromptState, getHostEnvironment } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { errorHandler } from '../../../prompt-helpers';
import { getNewSystemNameQuestion } from '../new-system/questions';
import { getServiceChoices } from './service-helper';

export enum abapOnPremInternalPromptNames {
    systemUrl = 'systemUrl',
    sapClient = 'sapClient',
    systemUsername = 'abapSystemUsername',
    systemPassword = 'abapSystemPassword'
}

export interface AbapOnPremAnswers extends Partial<OdataServiceAnswers> {
    [abapOnPremInternalPromptNames.systemUrl]?: string;
    [abapOnPremInternalPromptNames.systemUsername]?: string;
    [abapOnPremInternalPromptNames.systemPassword]?: string;
    [promptNames.serviceSelection]?: ServiceAnswer;
}

const cliServicePromptName = 'cliServicePromptName';

/**
 * Sap System service answer
 */
export type ServiceAnswer = {
    servicePath: string;
    serviceODataVersion: ODataVersion;
    toString: () => string;
    serviceType?: string;
};

/**
 * Convert the odata version type from the prompt (odata-service-writer) type to the axios-extension type.
 *
 * @param odataVersion
 * @returns
 */
function convertODataVersionType(odataVersion?: OdataVersion): ODataVersion | undefined {
    if (!odataVersion) {
        return odataVersion;
    }
    return odataVersion === OdataVersion.v2 ? ODataVersion.v2 : ODataVersion.v4;
}

/**
 * Get the Abap on-premise datasource questions.
 *
 * @param serviceSelectionPromptOptions
 * @returns property questions for the Abap on-premise datasource
 */
export function getAbapOnPremQuestions(
    serviceSelectionPromptOptions?: ServiceSelectionPromptOptions
): Question<AbapOnPremAnswers>[] {
    PromptState.reset();
    errorHandler.resetErrorState();
    const connectValidator = new ConnectionValidator();
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system is changed
    let lastSystemUrl: string | undefined;
    let lastService: ServiceAnswer | undefined;
    const requiredOdataVersion = serviceSelectionPromptOptions?.requiredOdataVersion;

    const questions: Question<AbapOnPremAnswers>[] = [
        {
            type: 'input',
            name: abapOnPremInternalPromptNames.systemUrl,
            message: t('prompts.systemUrl.message'),
            guiOptions: {
                hint: t('prompts.systemUrl.description'),
                mandatory: true,
                breadcrumb: true
            },
            validate: async (url) => {
                const valResult = await connectValidator.validateUrl(url, {
                    isSystem: true,
                    odataVersion: convertODataVersionType(requiredOdataVersion)
                });
                if (valResult === true) {
                    PromptState.odataService.connectedSystem = {
                        serviceProvider: connectValidator.serviceProvider
                    };
                    lastSystemUrl = url;
                }
                return valResult;
            }
        } as InputQuestion<AbapOnPremAnswers>,
        {
            type: 'input',
            name: abapOnPremInternalPromptNames.sapClient,
            message: t('prompts.sapClient.message'),
            guiOptions: {
                breadcrumb: t('prompts.sapClient.breadcrumb')
            },
            validate: validateClient
        } as InputQuestion<AbapOnPremAnswers>,
        {
            when: () => (connectValidator.validity.reachable ? connectValidator.validity.authRequired === true : false),
            type: 'input',
            name: abapOnPremInternalPromptNames.systemUsername,
            message: t('prompts.systemUsername.message'),
            guiOptions: {
                mandatory: true
            },
            validate: (user: string) => user?.length > 0
        } as InputQuestion<AbapOnPremAnswers>,
        {
            when: () => (connectValidator.validity.reachable ? connectValidator.validity.authRequired === true : false),
            type: 'password',
            guiOptions: {
                mandatory: true
            },
            name: abapOnPremInternalPromptNames.systemPassword,
            message: t('prompts.systemPassword.message'),
            guiType: 'login',
            mask: '*',
            validate: async (password, { systemUrl, abapSystemUsername, sapClient }: AbapOnPremAnswers) => {
                if (!(systemUrl && abapSystemUsername && password)) {
                    return false;
                }
                const valResult = await connectValidator.validateAuth(systemUrl, abapSystemUsername, password, {
                    isSystem: true,
                    sapClient
                });
                if (valResult === true) {
                    PromptState.odataService.connectedSystem = {
                        serviceProvider: connectValidator.serviceProvider
                    };
                    lastSystemUrl = systemUrl;
                }
                return valResult;
            }
        } as PasswordQuestion<AbapOnPremAnswers>,
        // New system question will allow user to give the system a user friendly name
        withCondition(
            [getNewSystemNameQuestion()],
            (answers: AbapOnPremAnswers) =>
                !!answers.systemUrl &&
                connectValidator.validity.reachable === true &&
                (connectValidator.validity.authenticated || connectValidator.validity.authRequired !== true)
        )[0],
        // Note: Service selection is required for multiple datasource types, so this definition may be moved up a level for reuse across multiple sap-system prompts.
        {
            when: (): boolean =>
                connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
            name: promptNames.serviceSelection,
            type: serviceSelectionPromptOptions?.useAutoComplete ? 'autocomplete' : 'list',
            message: t('prompts.systemService.message'),
            guiOptions: {
                breadcrumb: t('prompts.systemService.breadcrumb'),
                mandatory: true
            },
            source: (prevAnswers: AbapOnPremAnswers, input: string) =>
                searchChoices(input, serviceChoices as ListChoiceOptions[]),
            choices: async (answers: AbapOnPremAnswers) => {
                if (!serviceChoices || lastSystemUrl !== answers.systemUrl) {
                    let catalogs: CatalogService[] = [];
                    if (requiredOdataVersion) {
                        catalogs.push(connectValidator.catalogs[requiredOdataVersion]);
                    } else {
                        catalogs = Object.values(connectValidator.catalogs);
                    }
                    serviceChoices = await getServiceChoices(catalogs);
                }
                return serviceChoices;
            },
            additionalMessages: (selectedService: ServiceAnswer) => {
                if (serviceChoices?.length === 0) {
                    if (requiredOdataVersion) {
                        return {
                            message: t('prompts.warnings.noServicesAvailableForOdataVersion', {
                                odataVersion: requiredOdataVersion
                            }),
                            severity: Severity.warning
                        };
                    } else {
                        return {
                            message: t('prompts.warnings.noServicesAvailable'),
                            severity: Severity.warning
                        };
                    }
                }
                if (selectedService?.serviceType && selectedService.serviceType !== ServiceType.UI) {
                    return {
                        message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
                        severity: Severity.warning
                    };
                }
            },
            default: () => (serviceChoices?.length > 1 ? undefined : 0),
            // Warning: only executes in YUI not cli
            validate: async (
                service: ServiceAnswer,
                answers: Partial<AbapOnPremAnswers>
            ): Promise<string | boolean | ValidationLink> => {
                if (!answers.systemUrl) {
                    return false;
                }
                if (errorHandler.hasError()) {
                    return errorHandler.getValidationErrorHelp() ?? false;
                }
                if (service && lastService?.servicePath !== service.servicePath) {
                    lastService = service;
                    return getServiceDetails(service, answers.systemUrl, connectValidator);
                }
                return true;
            }
        } as ListQuestion<AbapOnPremAnswers>
    ];

    // Only for CLI use as `list` prompt validation does not run on CLI
    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: AbapOnPremAnswers): Promise<boolean> => {
                // todo ?
                /**
                 * if (serviceSelectionPromptOptions?.requiredOdataVersion) {
                        return {
                            message: t('prompts.warnings.noServicesAvailableForOdataVersion', {
                                odataVersion: serviceSelectionPromptOptions.requiredOdataVersion
                            }),
                            severity: Severity.warning
                        };
                    } else {
                        return {
                            message: t('prompts.warnings.noServicesAvailable'),
                            severity: Severity.warning
                        };
                    }
                 */
                if (!errorHandler.hasError(true) && answers.serviceSelection && answers.systemUrl) {
                    const result = await getServiceDetails(
                        answers.serviceSelection,
                        answers.systemUrl,
                        connectValidator
                    );
                    if (typeof result === 'string') {
                        LoggerHelper.logger.error(result);
                    }
                }
                return false;
            },
            name: cliServicePromptName
        } as Question);
    }

    return questions;
}

/**
 * Gets the service details and internally sets the PromptState.odataService properties.
 * If an error occurs, the error message is returned for use in validators.
 *
 * @param service
 * @param systemUrl
 * @param connectionValidator
 * @returns true if successful, setting the PromptState.odataService properties, or an error message indicating why the service details could not be retrieved.
 */
async function getServiceDetails(
    service: ServiceAnswer,
    systemUrl: string,
    connectionValidator: ConnectionValidator
): Promise<string | boolean> {
    // serviceType = await getServiceType(sapSystem, choice.serviceType, service);
    const serviceResult = await getServiceMetadata(
        service.servicePath,
        connectionValidator.catalogs[service.serviceODataVersion],
        connectionValidator.axiosConfig
    );
    if (typeof serviceResult === 'string') {
        return serviceResult;
    }
    PromptState.odataService.annotations = serviceResult?.annotations;
    PromptState.odataService.metadata = serviceResult?.metadata;
    PromptState.odataService.odataVersion =
        service.serviceODataVersion === ODataVersion.v2 ? OdataVersion.v2 : OdataVersion.v4;
    PromptState.odataService.servicePath = service.servicePath;
    PromptState.odataService.origin = systemUrl;
    return true;
}

/**
 * Gets the service metadata and annotations for the specified service path.
 *
 * @param servicePath service path
 * @param catalog the catalog service used to get the annotations
 * @param axiosConfig the axios configuration used to create the odata service provider when getting the metadata
 * @returns Promise<string | boolean>, string error message or true if successful
 */
async function getServiceMetadata(
    servicePath: string,
    catalog: CatalogService,
    axiosConfig: AxiosRequestConfig
): Promise<{ annotations: Annotations[]; metadata: string; serviceProvider: ServiceProvider } | string> {
    let annotations: Annotations[] = [];
    try {
        try {
            annotations = await catalog.getAnnotations({ path: servicePath });
        } catch {
            LoggerHelper.logger.info(t('prompts.validationMessages.noAnnotations'));
        }
        // todo: Do we really need to create a new service provider for each service? We already have a catalog service connection
        const serviceProvider = create(axiosConfig);
        const odataService = serviceProvider.service(servicePath);
        LoggerHelper.attachAxiosLogger(serviceProvider.interceptors);
        const metadata = await odataService.metadata();
        return {
            annotations,
            metadata,
            serviceProvider
        };
    } catch (error) {
        LoggerHelper.logger.error(`An error occurred while getting service metadata for service : ${servicePath}`);
        return t('errors.serviceMetadataError', { servicePath });
    }
}
