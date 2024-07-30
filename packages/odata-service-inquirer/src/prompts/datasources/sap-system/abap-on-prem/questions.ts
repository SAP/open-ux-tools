import { Severity } from '@sap-devx/yeoman-ui-types';
import type { CatalogService, V2CatalogService } from '@sap-ux/axios-extension';
import { ODataVersion, ServiceType } from '@sap-ux/axios-extension';
import { searchChoices, withCondition, type ListQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { validateClient } from '@sap-ux/project-input-validator';
import type { InputQuestion, ListChoiceOptions, PasswordQuestion, Question } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';
import { t } from '../../../../i18n';
import {
    hostEnvironment,
    promptNames,
    type OdataServiceAnswers,
    type ServiceSelectionPromptOptions,
    type ValidationLink,
    type OdataServicePromptOptions,
    type SystemNamePromptOptions
} from '../../../../types';
import { PromptState, getHostEnvironment } from '../../../../utils';
import { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import type { NewSystemAnswers } from '../new-system/questions';
import { getUserSystemNameQuestion } from '../new-system/questions';
import { getServiceChoices, getServiceMetadata, getServiceType } from './service-helper';

export enum abapOnPremInternalPromptNames {
    systemUrl = 'systemUrl',
    sapClient = 'sapClient',
    systemUsername = 'abapSystemUsername',
    systemPassword = 'abapSystemPassword'
}

export interface AbapOnPremAnswers extends Partial<OdataServiceAnswers>, NewSystemAnswers {
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
 * @param odataVersion The odata version to convert
 * @returns The converted odata version
 */
function convertODataVersionType(odataVersion?: OdataVersion): ODataVersion | undefined {
    if (!odataVersion) {
        return undefined;
    }
    return odataVersion === OdataVersion.v2 ? ODataVersion.v2 : ODataVersion.v4;
}

/**
 * Get the Abap on-premise datasource questions.
 *
 * @param promptOptions options for prompts. Applicable options are: {@link ServiceSelectionPromptOptions}, {@link SystemNamePromptOptions}
 * @returns property questions for the Abap on-premise datasource
 */
export function getAbapOnPremQuestions(promptOptions?: OdataServicePromptOptions): Question<AbapOnPremAnswers>[] {
    PromptState.reset();
    const connectValidator = new ConnectionValidator();
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system is changed
    let previousSystemUrl: string | undefined;
    let previousService: ServiceAnswer | undefined;
    // Prompt options
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;

    const questions: Question<AbapOnPremAnswers>[] = getAbapOnPremSystemQuestions(
        promptOptions?.userSystemName,
        connectValidator,
        requiredOdataVersion
    );

    questions.push({
        when: (): boolean =>
            connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
        name: promptNames.serviceSelection,
        type: promptOptions?.serviceSelection?.useAutoComplete ? 'autocomplete' : 'list',
        message: t('prompts.systemService.message'),
        guiOptions: {
            breadcrumb: t('prompts.systemService.breadcrumb'),
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        source: (prevAnswers: AbapOnPremAnswers, input: string) =>
            searchChoices(input, serviceChoices as ListChoiceOptions[]),
        choices: async (answers: AbapOnPremAnswers) => {
            if (!serviceChoices || previousSystemUrl !== answers.systemUrl) {
                let catalogs: CatalogService[] = [];
                if (requiredOdataVersion) {
                    catalogs.push(connectValidator.catalogs[requiredOdataVersion]);
                } else {
                    catalogs = Object.values(connectValidator.catalogs);
                }
                previousSystemUrl = answers.systemUrl;
                serviceChoices = await getServiceChoices(catalogs);
            }
            return serviceChoices;
        },
        additionalMessages: async (selectedService: ServiceAnswer) => {
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
            if (selectedService) {
                let serviceType = selectedService.serviceType;
                if (selectedService.serviceODataVersion === ODataVersion.v2) {
                    serviceType = await getServiceType(
                        selectedService.servicePath,
                        selectedService.serviceType,
                        connectValidator.catalogs[ODataVersion.v2] as V2CatalogService
                    );
                }
                if (serviceType && serviceType !== ServiceType.UI) {
                    return {
                        message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
                        severity: Severity.warning
                    };
                }
            }
        },
        default: () => (serviceChoices?.length > 1 ? undefined : 0),
        // Warning: only executes in YUI not cli
        validate: async (
            service: ServiceAnswer,
            { systemUrl }: Partial<AbapOnPremAnswers> = {}
        ): Promise<string | boolean | ValidationLink> => {
            if (!systemUrl) {
                return false;
            }
            // Dont re-request the same service details
            if (service && previousService?.servicePath !== service.servicePath) {
                previousService = service;
                return getServiceDetails(service, systemUrl, connectValidator);
            }
            return true;
        }
    } as ListQuestion<AbapOnPremAnswers> | AutocompleteQuestionOptions<AbapOnPremAnswers>);

    // Only for CLI use as `list` prompt validation does not run on CLI
    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: AbapOnPremAnswers): Promise<boolean> => {
                if (answers.serviceSelection && answers.systemUrl) {
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
 * Gets the Abap on-premise system questions.
 *
 * @param systemNamePromptOptions options for the system name prompt see {@link SystemNamePromptOptions}
 * @param connectionValidator reference to the existing connection validator, a new one will be created otherwise
 * @param requiredOdataVersion the required OData version for the service, this will be used to narrow the catalog service connections
 * @returns the Abap on-premise system questions
 */
export function getAbapOnPremSystemQuestions(
    systemNamePromptOptions?: SystemNamePromptOptions,
    connectionValidator?: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Question<AbapOnPremAnswers>[] {
    const connectValidator = connectionValidator ?? new ConnectionValidator();
    let validClient = true;

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
            validate: (client) => {
                const valRes = validateClient(client);
                if (valRes === true) {
                    validClient = true;
                    return true;
                }
                validClient = false;
                return valRes;
            }
        } as InputQuestion<AbapOnPremAnswers>,
        {
            when: () => connectValidator.isAuthRequired(),
            type: 'input',
            name: abapOnPremInternalPromptNames.systemUsername,
            message: t('prompts.systemUsername.message'),
            guiOptions: {
                mandatory: true
            },
            validate: (user: string) => user?.length > 0
        } as InputQuestion<AbapOnPremAnswers>,
        {
            when: () => connectValidator.isAuthRequired(),
            type: 'password',
            guiOptions: {
                mandatory: true
            },
            name: abapOnPremInternalPromptNames.systemPassword,
            message: t('prompts.systemPassword.message'),
            guiType: 'login',
            mask: '*',
            validate: async (password, { systemUrl, abapSystemUsername, sapClient }: AbapOnPremAnswers) => {
                if (!(systemUrl && abapSystemUsername && password && validClient)) {
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
                }
                return valResult;
            }
        } as PasswordQuestion<AbapOnPremAnswers>
    ];

    if (systemNamePromptOptions?.exclude !== true) {
        // New system question will allow user to give the system a user friendly name
        questions.push(
            withCondition(
                [getUserSystemNameQuestion()],
                (answers: AbapOnPremAnswers) =>
                    !!answers.systemUrl &&
                    connectValidator.validity.reachable === true &&
                    (connectValidator.validity.authenticated || connectValidator.validity.authRequired !== true)
            )[0]
        );
    }

    return questions;
}

/**
 * Requests and sets the service details to the PromptState.odataService properties.
 * If an error occurs, the error message is returned for use in validators.
 *
 * @param service the specific service to get details for
 * @param systemUrl the system origin where the service is hosted
 * @param connectionValidator a reference to the connection validator
 * @returns true if successful, setting the PromptState.odataService properties, or an error message indicating why the service details could not be retrieved.
 */
async function getServiceDetails(
    service: ServiceAnswer,
    systemUrl: string,
    connectionValidator: ConnectionValidator
): Promise<string | boolean> {
    const serviceCatalog = connectionValidator.catalogs[service.serviceODataVersion];

    const serviceResult = await getServiceMetadata(
        service.servicePath,
        serviceCatalog,
        connectionValidator.serviceProvider
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
