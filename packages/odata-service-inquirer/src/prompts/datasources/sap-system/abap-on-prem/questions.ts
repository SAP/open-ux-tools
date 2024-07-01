import { Severity } from '@sap-devx/yeoman-ui-types';
import type { Annotations, AxiosRequestConfig, CatalogService, ServiceProvider } from '@sap-ux/axios-extension';
import { ODataVersion, create } from '@sap-ux/axios-extension';
import { withCondition, type ListQuestion } from '@sap-ux/inquirer-common';
import { validateClient } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListChoiceOptions, PasswordQuestion, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { ValidationLink } from '../../../../types';
import { type OdataServiceAnswers } from '../../../../types';
import { PromptState } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import { getServiceChoices } from './service-helper';
import { errorHandler } from '../../../prompt-helpers';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import LoggerHelper from '../../../logger-helper';
import { getNewSystemNameQuestion } from '../questions';

export enum abapOnPremInternalPromptNames {
    systemUrl = 'systemUrl',
    sapClient = 'sapClient',
    systemUsername = 'abapSystemUsername',
    systemPassword = 'abapSystemPassword',
    systemService = 'systemService'
}

export interface AbapOnPremAnswers extends Partial<OdataServiceAnswers> {
    [abapOnPremInternalPromptNames.systemUrl]?: string;
    [abapOnPremInternalPromptNames.systemUsername]?: string;
    [abapOnPremInternalPromptNames.systemPassword]?: string;
    [abapOnPremInternalPromptNames.systemService]?: ServiceAnswer;
}

/**
 * Sap System service answer
 */
export type ServiceAnswer = {
    servicePath: string;
    serviceODataVersion: ODataVersion;
    toString: () => string;
    serviceType?: string;
};
// todo: Replace with axios-extension exported type
export const SERVICE_TYPE = {
    UI: 'UI',
    NOT_CLASSIFIED: 'Not Classified',
    WEB_API: 'WEB_API',
    NOT_DETERMINED: 'Not Determined'
};
/**
 * Get the Abap on-premise datasource questions.
 *
 * @returns property questions for the Abap on-premise datasource
 */
export function getAbapOnPremQuestions(): Question<AbapOnPremAnswers>[] {
    PromptState.reset();
    errorHandler.resetErrorState();
    const connectValidator = new ConnectionValidator();
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system is changed
    let lastSystemUrl: string | undefined;
    let lastService: ServiceAnswer | undefined;

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
                const valResult = await connectValidator.validateUrl(url, { isSystem: true });
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
                (connectValidator.validity.authenticated || connectValidator.validity.authRequired !== true)
        )[0],
        {
            when: (): boolean =>
                connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
            name: abapOnPremInternalPromptNames.systemService,
            type: 'list',
            message: t('prompts.systemService.message'),
            guiOptions: {
                breadcrumb: t('prompts.systemService.breadcrumb'),
                mandatory: true
            },
            choices: async (answers) => {
                if (!serviceChoices || lastSystemUrl !== answers.systemUrl) {
                    serviceChoices = await getServiceChoices(Object.values(connectValidator.catalogs));
                }
                return serviceChoices;
            },
            additionalMessages: (selectedService: ServiceAnswer) => {
                if (selectedService?.serviceType && selectedService.serviceType !== SERVICE_TYPE.UI) {
                    return {
                        message: t('prompts.nonUIServiceTypeWarningMessage', { serviceTypeDesc: 'A2X' }),
                        severity: Severity.warning
                    };
                }

                if (serviceChoices?.length === 0) {
                    return {
                        message: t('prompts.noServicesWarning'),
                        severity: Severity.warning
                    };
                }
            },
            default: (answers: AbapOnPremAnswers) => {
                if (answers.systemService) {
                    return answers.systemService;
                }
                return serviceChoices.length > 1 ? undefined : 0;
            },
            // Warning: only executes in YUI not cli
            validate: async (
                service: ServiceAnswer,
                answers: Partial<AbapOnPremAnswers>
            ): Promise<string | boolean | ValidationLink> => {
                if (errorHandler.hasError()) {
                    return errorHandler.getValidationErrorHelp() ?? false;
                }
                if (service && lastService?.servicePath !== service.servicePath) {
                    lastService = service;
                    return getServiceDetails(service, answers.systemUrl!, connectValidator);
                }
                return true;
            }
        } as ListQuestion<AbapOnPremAnswers>
    ];
    return questions;
}

/**
 * Gets the serice details and sets the PromptState.odataService properties.
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
