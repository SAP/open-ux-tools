/**
 * Service selection prompting for SAP systems. Used by new and existing system prompts.
 *
 */
import type { CatalogService } from '@sap-ux/axios-extension';
import { AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    type ChoiceOptions,
    type CommonPromptOptions,
    ERROR_TYPE,
    ErrorHandler,
    extendWithOptions,
    type ListQuestion,
    searchChoices,
    type SearchQuestion,
    type ValidationLink,
    withCondition,
    type YUIQuestion
} from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import type { Answers } from 'inquirer';
import { t } from '../../../../i18n.js';
import type { ServiceSelectionPromptOptions, OdataServicePromptOptions } from '../../../../types.js';

import { promptNames } from '../../../../types.js';
import {
    areArraysEquivalent,
    getDefaultChoiceIndex,
    getPromptHostEnvironment,
    PromptState
} from '../../../../utils/index.js';
import type { ConnectionValidator } from '../../../connectionValidator.js';
import LoggerHelper from '../../../logger-helper.js';
import { errorHandler } from '../../../prompt-helpers.js';
import { getValueHelpDownloadPrompt } from '../external-services/value-help-download.js';
import {
    getSelectedServiceLabel,
    getSelectedServiceMessage,
    getServiceChoices,
    sendDestinationServiceSuccessTelemetryEvent,
    validateService
} from '../service-selection/service-helper.js';
import type { SystemSelectionAnswers } from '../system-selection/index.js';
import { type ServiceAnswer } from './types.js';

const cliServicePromptName = 'cliServiceSelection';

/**
 * Get the service selection prompt for an Abap system connection (on-prem or on-btp). The service selection prompt is used to select a service from the system catalog.
 *
 * @param connectValidator - A reference to the active connection validator, used to validate the service selection and retrieve service details.
 * @param promptNamespace - The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 *     This is used to avoid conflicts with other prompts of the same types.
 * @param promptOptions - Options for the service selection prompt see {@link OdataServicePromptOptions}
 * @param hideValueHelpDownloadPrompt - If true the value help download confirm prompt will be hidden (default: true)
 * @returns the service selection prompt
 */
export function getSystemServiceQuestion(
    connectValidator: ConnectionValidator,
    promptNamespace: string,
    promptOptions?: ServiceSelectionPromptOptions,
    hideValueHelpDownloadPrompt = true
): YUIQuestion<ServiceAnswer>[] {
    let serviceChoices: ChoiceOptions<ServiceAnswer>[] = [];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system or client is changed
    let previousSystemUrl: string | undefined;
    let previousClient: string | undefined;
    let previousService: ServiceAnswer | undefined;
    let previousServiceFilter: ServiceSelectionPromptOptions['serviceFilter'];
    // State shared across validate and additionalMessages functions
    let hasBackendAnnotations: boolean | undefined;
    // Wrap to allow pass by ref to nested prompts
    const convertedMetadataRef: {
        convertedMetadata: ConvertedMetadata | undefined;
    } = {
        convertedMetadata: undefined
    };

    const requiredOdataVersion = promptOptions?.requiredOdataVersion;
    const serviceSelectionPromptName = `${promptNamespace}:${promptNames.serviceSelection}`;

    // SystemSelectionAnswers should not be needed here in the interest of keeping these prompts decoupled but TelemetryHelper is used here and it requires the previously selected destination
    const loadServiceChoices = async (answers?: SystemSelectionAnswers): Promise<ChoiceOptions<ServiceAnswer>[]> => {
        if (
            serviceChoices.length === 0 ||
            previousSystemUrl !== connectValidator.validatedUrl ||
            previousClient !== connectValidator.validatedClient ||
            !areArraysEquivalent(previousServiceFilter, promptOptions?.serviceFilter)
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
                previousServiceFilter = promptOptions?.serviceFilter ? [...promptOptions.serviceFilter] : undefined;

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
                LoggerHelper.logger.error(t('errors.noCatalogOrServiceAvailable'));
            }
        }
        return serviceChoices;
    };

    // inquirer 13's native `search` arm no longer passes the previous answers to `source`;
    // the latest answers are captured from the `choices`/`validate` cycle via this closure instead.
    let searchAnswers: SystemSelectionAnswers | undefined;

    // `base` holds the shared fields; `validate` may yield a rich `ValidationLink` so it is left to
    // inference here and the concrete question shape is enforced by the arm casts below.
    const base = {
        when: (): boolean =>
            connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
        name: serviceSelectionPromptName,
        message: () => getSelectedServiceLabel(connectValidator.connectedUserName),
        guiOptions: {
            breadcrumb: t('prompts.systemService.breadcrumb'),
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        showOutputTabLink: 'validationMessageOverflow',
        additionalMessages: (selectedService?: unknown) =>
            getSelectedServiceMessage(serviceChoices, selectedService as ServiceAnswer, connectValidator, {
                requiredOdataVersion,
                hasAnnotations: hasBackendAnnotations,
                showCollabDraftWarnOptions: convertedMetadataRef.convertedMetadata
                    ? {
                          showCollabDraftWarning: !!promptOptions?.showCollaborativeDraftWarning,
                          edmx: convertedMetadataRef.convertedMetadata
                      }
                    : undefined,
                serviceFilter: promptOptions?.serviceFilter
            }),
        validate: async (service: ServiceAnswer, answers?: Answers): Promise<string | boolean | ValidationLink> => {
            searchAnswers = answers as SystemSelectionAnswers | undefined;
            const serviceAnswer = service;

            if (!connectValidator.validatedUrl) {
                return false;
            }
            // if no choices are available and an error is present, return the error message
            if (serviceChoices.length === 0 && errorHandler.hasError()) {
                return ErrorHandler.getHelpForError(ERROR_TYPE.SERVICES_UNAVAILABLE) ?? false;
            }
            // Dont re-request the same service details
            if (
                serviceAnswer &&
                (previousService?.servicePath !== serviceAnswer.servicePath ||
                    previousService?.servicePath !== PromptState.odataService.servicePath) // PromptState was reset by a system selection
            ) {
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
    };

    // inquirer 13's `select`/`search` default is a choice value (not the inquirer 8 list index); map the
    // former index-returning default logic to the choice value at that index.
    const getDefaultServiceValue = (): ServiceAnswer | undefined => {
        const defaultIndex = getDefaultChoiceIndex(serviceChoices as Answers[]);
        return defaultIndex === undefined ? undefined : serviceChoices[defaultIndex]?.value;
    };

    let systemServiceQuestion: YUIQuestion<ServiceAnswer> = promptOptions?.useAutoComplete
        ? ({
              ...base,
              type: 'search',
              source: async (term: string | undefined): Promise<ChoiceOptions[]> =>
                  searchChoices(term ?? '', (await loadServiceChoices(searchAnswers)) as ChoiceOptions[]),
              default: getDefaultServiceValue
          } as SearchQuestion<ServiceAnswer>)
        : ({
              ...base,
              type: 'select',
              choices: async (answers: SystemSelectionAnswers) => loadServiceChoices(answers),
              default: getDefaultServiceValue
          } as ListQuestion<ServiceAnswer>);

    // Add additional messages to prompts if specified in the prompt options
    if (promptOptions?.additionalMessages) {
        const promptOptsToApply: Record<string, CommonPromptOptions> = {
            [serviceSelectionPromptName]: { additionalMessages: promptOptions.additionalMessages }
        };
        systemServiceQuestion = extendWithOptions(
            [systemServiceQuestion] as YUIQuestion[],
            promptOptsToApply,
            PromptState.odataService
        )[0] as YUIQuestion<ServiceAnswer>;
    }

    const questions: YUIQuestion<ServiceAnswer>[] = [systemServiceQuestion];

    // Only for CLI use as `select` prompt validation does not run on CLI unless autocomplete is used
    if (getPromptHostEnvironment() === hostEnvironment.cli && !promptOptions?.useAutoComplete) {
        questions.push({
            when: async (answers: Answers): Promise<boolean> => {
                const selectedService = answers?.[`${promptNamespace}:${promptNames.serviceSelection}`];
                if (selectedService && connectValidator.validatedUrl) {
                    const { validationResult, hasAnnotations, convertedMetadata } = await validateService(
                        selectedService,
                        connectValidator
                    );
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
        } as unknown as YUIQuestion<ServiceAnswer>);
    }

    if (!hideValueHelpDownloadPrompt) {
        /**
         * Only show the value help download prompt when a service has been validated (convertedMetadata is set), is odata version v4 and is an abap connection
         */
        questions.push(
            ...(withCondition(
                getValueHelpDownloadPrompt(connectValidator, promptNamespace, convertedMetadataRef),
                (answers: Answers) =>
                    !!(connectValidator.serviceProvider instanceof AbapServiceProvider) &&
                    !!convertedMetadataRef.convertedMetadata &&
                    (answers as { [serviceSelectionPromptName]?: ServiceAnswer })?.[serviceSelectionPromptName]
                        ?.serviceODataVersion === ODataVersion.v4
            ) as YUIQuestion<ServiceAnswer>[])
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
): Promise<ChoiceOptions<ServiceAnswer>[]> {
    let catalogs: CatalogService[] = [];
    if (requiredOdataVersion && availableCatalogs[requiredOdataVersion]) {
        catalogs.push(availableCatalogs[requiredOdataVersion] as CatalogService);
    } else {
        catalogs = Object.values(availableCatalogs).filter((cat): cat is CatalogService => cat !== undefined);
    }
    return await getServiceChoices(catalogs, serviceFilter);
}
