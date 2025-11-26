/**
 * Service selection prompting for SAP systems. Used by new and existing system prompts.
 *
 */
import { AbapServiceProvider, CatalogService, ODataVersion } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    type CommonPromptOptions,
    ERROR_TYPE,
    ErrorHandler,
    extendWithOptions,
    searchChoices,
    type ValidationLink,
    withCondition,
    type YUIQuestion
} from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { t } from '../../../../i18n';
import type { OdataServicePromptOptions, ServiceSelectionPromptOptions } from '../../../../types';
import { promptNames } from '../../../../types';
import { getDefaultChoiceIndex, getPromptHostEnvironment, PromptState } from '../../../../utils';
import type { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { errorHandler } from '../../../prompt-helpers';
import {
    getSelectedServiceLabel,
    getSelectedServiceMessage,
    getServiceChoices,
    sendDestinationServiceSuccessTelemetryEvent,
    validateService
} from '../service-selection/service-helper';
import type { SystemSelectionAnswers } from '../system-selection';
import { type ServiceAnswer } from './types';
import { getValueHelpDownloadPrompt } from '../external-services/value-help-download';
import { PromptsType } from '../../../../../../fe-fpm-writer/src';

const cliServicePromptName = 'cliServiceSelection';

/**
 * Get the service selection prompt for an Abap system connection (on-prem or on-btp). The service selection prompt is used to select a service from the system catalog.
 *
 * @param connectValidator A reference to the active connection validator, used to validate the service selection and retrieve service details.
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 *     This is used to avoid conflicts with other prompts of the same types.
 * @param promptOptions Options for the service selection prompt see {@link OdataServicePromptOptions}
 * @param includeValueHelpDownloadPrompt If true the value help download confirm prompt will be included
 * @returns the service selection prompt
 */
export function getSystemServiceQuestion(
    connectValidator: ConnectionValidator,
    promptNamespace: string,
    promptOptions?: ServiceSelectionPromptOptions,
    showValueHelpDownloadPrompt = false
): Question<ServiceAnswer>[] {
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[] = [];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system or client is changed
    let previousSystemUrl: string | undefined;
    let previousClient: string | undefined;
    let previousService: ServiceAnswer | undefined;
    // State shared across validate and additionalMessages functions
    let hasBackendAnnotations: boolean | undefined;
    // Wrap to allow pass by ref to nested prompts
    const convertedMetadataRef: {
        convertedMetadata: ConvertedMetadata | undefined
    } = {
        convertedMetadata: undefined
    }

    const requiredOdataVersion = promptOptions?.requiredOdataVersion;
    const serviceSelectionPromptName = `${promptNamespace}:${promptNames.serviceSelection}`;

    let systemServiceQuestion = {
        when: (): boolean =>
            connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
        name: serviceSelectionPromptName,
        type: promptOptions?.useAutoComplete ? 'autocomplete' : 'list',
        message: () => getSelectedServiceLabel(connectValidator.connectedUserName),
        guiOptions: {
            breadcrumb: t('prompts.systemService.breadcrumb'),
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        source: (prevAnswers: unknown, input: string) => searchChoices(input, serviceChoices as ListChoiceOptions[]),
        // SystemSelectionAnswers should not be needed here in the interest of keeping these prompts decoupled but TelemetryHelper is used here and it requires the previously selected destination
        choices: async (answers: SystemSelectionAnswers) => {
            if (
                serviceChoices.length === 0 ||
                previousSystemUrl !== connectValidator.validatedUrl ||
                previousClient !== connectValidator.validatedClient
            ) {
                // if we have a catalog, use it to list services
                if (connectValidator.catalogs[OdataVersion.v2] || connectValidator.catalogs[OdataVersion.v4]) {
                    serviceChoices = await createServiceChoicesFromCatalog(
                        connectValidator.catalogs,
                        requiredOdataVersion,
                        promptOptions?.serviceFilter
                    );
                    previousSystemUrl = connectValidator.validatedUrl;
                    previousClient = connectValidator.validatedClient;

                    // Telemetry event for successful service listing using a destination
                    if (answers?.[`${promptNames.systemSelection}`]?.type === 'destination') {
                        sendDestinationServiceSuccessTelemetryEvent(
                            answers?.[`${promptNames.systemSelection}`]?.system as Destination
                        );
                    }
                } else if (
                    connectValidator.odataService &&
                    connectValidator.validatedUrl &&
                    !(await connectValidator.isAuthRequired())
                ) {
                    // We have connected to a service endpoint, use this service as the only choice
                    const serviceUrl = new URL(connectValidator.destinationUrl ?? connectValidator.validatedUrl);
                    serviceChoices = [
                        {
                            name: serviceUrl.toString(),
                            value: {
                                servicePath: serviceUrl.pathname
                            } as ServiceAnswer
                        }
                    ];
                    // Telemetry event for successful service listing using a destination
                    if (answers?.[`${promptNames.systemSelection}`]?.type === 'destination') {
                        sendDestinationServiceSuccessTelemetryEvent(
                            answers?.[`${promptNames.systemSelection}`]?.system as Destination
                        );
                    }
                } else {
                    LoggerHelper.logger.error(t('error.noCatalogOrServiceAvailable'));
                }
            }
            return serviceChoices;
        },
        additionalMessages: (selectedService: ServiceAnswer) =>
            getSelectedServiceMessage(serviceChoices, selectedService, connectValidator, {
                requiredOdataVersion,
                hasAnnotations: hasBackendAnnotations,
                showCollabDraftWarnOptions: convertedMetadataRef.convertedMetadata
                    ? {
                          showCollabDraftWarning: !!promptOptions?.showCollaborativeDraftWarning,
                          edmx: convertedMetadataRef.convertedMetadata
                      }
                    : undefined
            }),
        default: () => getDefaultChoiceIndex(serviceChoices as Answers[]),
        // Warning: only executes in YUI and cli when automcomplete is used
        validate: async (
            service: ServiceAnswer | ListChoiceOptions<ServiceAnswer>
        ): Promise<string | boolean | ValidationLink> => {
            let serviceAnswer = service as ServiceAnswer;
            // Autocomplete passes the entire choice object as the answer, so we need to extract the value
            if (promptOptions?.useAutoComplete && (service as ListChoiceOptions).value) {
                serviceAnswer = (service as ListChoiceOptions).value;
            }

            if (!connectValidator.validatedUrl) {
                return false;
            }
            // if no choices are available and an error is present, return the error message
            if (serviceChoices.length === 0 && errorHandler.hasError()) {
                return ErrorHandler.getHelpForError(ERROR_TYPE.SERVICES_UNAVAILABLE) ?? false;
            }
            // Dont re-request the same service details
            if (serviceAnswer && previousService?.servicePath !== serviceAnswer.servicePath) {
                hasBackendAnnotations = undefined;
                convertedMetadataRef.convertedMetadata = undefined;
                previousService = serviceAnswer;
                const validationResult = await validateService(serviceAnswer, connectValidator, requiredOdataVersion);
                hasBackendAnnotations = validationResult.hasAnnotations;
                convertedMetadataRef.convertedMetadata = validationResult.convertedMetadata;
                return validationResult.validationResult;
            }
            return true;
        }
    } as Question<ServiceAnswer>;

    // Add additional messages to prompts if specified in the prompt options
    if (promptOptions?.additionalMessages) {
        const promptOptsToApply: Record<string, CommonPromptOptions> = {
            [serviceSelectionPromptName]: { additionalMessages: promptOptions.additionalMessages }
        };
        systemServiceQuestion = extendWithOptions(
            [systemServiceQuestion] as YUIQuestion[],
            promptOptsToApply,
            PromptState.odataService
        )[0];
    }

    const questions: Question<ServiceAnswer>[] = [systemServiceQuestion];

    // Only for CLI use as `list` prompt validation does not run on CLI unless autocomplete plugin is used
    if (getPromptHostEnvironment() === hostEnvironment.cli && !promptOptions?.useAutoComplete) {
        questions.push({
            when: async (answers: Answers): Promise<boolean> => {
                const selectedService = answers?.[`${promptNamespace}:${promptNames.serviceSelection}`];
                if (selectedService && connectValidator.validatedUrl) {
                    const {
                        validationResult,
                        hasAnnotations,
                        convertedMetadata
                    } = await validateService(selectedService, connectValidator);
                    if (typeof validationResult === 'string') {
                        LoggerHelper.logger.error(validationResult);
                        throw new Error(validationResult);
                    }
                    hasBackendAnnotations = hasAnnotations;
                    convertedMetadataRef.convertedMetadata = convertedMetadata;
                }
                if (serviceChoices.length === 0 && errorHandler.hasError()) {
                    const noServicesError = ErrorHandler.getHelpForError(ERROR_TYPE.SERVICES_UNAVAILABLE)!.toString();
                    throw new Error(noServicesError);
                }
                return false;
            },
            name: `${promptNamespace}:${cliServicePromptName}`
        } as Question);
    }
 
    if (showValueHelpDownloadPrompt) {
        /**
         * Only show the value help download prompt when a service has been validated (convertedMetadata is set), is odata version v4 and is an abap connection
         */
        questions.push(
            ...withCondition(
                [
                    getValueHelpDownloadPrompt(
                        connectValidator,
                        promptNamespace,
                        convertedMetadataRef
                    )
                ],
                (answers : { [serviceSelectionPromptName]?: ServiceAnswer  }) =>
                    !!(connectValidator.serviceProvider instanceof AbapServiceProvider) &&
                    !!convertedMetadataRef.convertedMetadata &&
                    ((answers?.[serviceSelectionPromptName]))?.serviceODataVersion === ODataVersion.v4
            )
        );
    }

    return questions;
}
/**
 * Create service choices from the catalog.
 *
 * @param availableCatalogs catalogs that can be used to list services
 * @param requiredOdataVersion the required OData version to list services for, if not provided all available catalogs will be used
 * @param serviceFilter list of service ids used for filtering the choices
 * @returns service choices
 */
async function createServiceChoicesFromCatalog(
    availableCatalogs: Record<ODataVersion, CatalogService | undefined>,
    requiredOdataVersion?: OdataVersion,
    serviceFilter?: string[]
): Promise<ListChoiceOptions<ServiceAnswer>[]> {
    let catalogs: CatalogService[] = [];
    if (requiredOdataVersion && availableCatalogs[requiredOdataVersion]) {
        catalogs.push(availableCatalogs[requiredOdataVersion] as CatalogService);
    } else {
        catalogs = Object.values(availableCatalogs).filter((cat): cat is CatalogService => cat !== undefined);
    }
    return await getServiceChoices(catalogs, serviceFilter);
}
