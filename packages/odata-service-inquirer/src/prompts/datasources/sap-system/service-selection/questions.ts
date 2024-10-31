/**
 * Service selection prompting for SAP systems. Used by new and existing system prompts.
 *
 */
import type { CatalogService } from '@sap-ux/axios-extension';
import { searchChoices, type ListQuestion } from '@sap-ux/inquirer-common';
import type { Answers, ListChoiceOptions, Question } from 'inquirer';
import { ERROR_TYPE, ErrorHandler } from '../../../../error-handler/error-handler';
import { t } from '../../../../i18n';
import type { OdataServicePromptOptions, ValidationLink } from '../../../../types';
import { hostEnvironment, promptNames } from '../../../../types';
import { getDefaultChoiceIndex, getHostEnvironment } from '../../../../utils';
import type { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { errorHandler } from '../../../prompt-helpers';
import {
    getSelectedServiceLabel,
    getSelectedServiceMessage,
    getServiceChoices,
    getServiceDetails
} from '../service-selection/service-helper';
import { type ServiceAnswer } from './types';
import { OdataVersion } from '@sap-ux/odata-service-writer';

const cliServicePromptName = 'cliServiceSelection';

/**
 * Get the service selection prompt for an Abap system connection (on-prem or on-btp). The service selection prompt is used to select a service from the system catalog.
 *
 * @param connectValidator A reference to the active connection validator, used to validate the service selection and retrieve service details.
 * @param promptNamespace The namespace for the prompt, used to identify the prompt instance and namespaced answers.
 *     This is used to avoid conflicts with other prompts of the same types.
 * @param promptOptions Options for the service selection prompt see {@link OdataServicePromptOptions}
 * @returns the service selection prompt
 */
export function getSystemServiceQuestion(
    connectValidator: ConnectionValidator,
    promptNamespace: string,
    promptOptions?: OdataServicePromptOptions
): Question<ServiceAnswer>[] {
    let serviceChoices: ListChoiceOptions<ServiceAnswer>[] = [];
    // Prevent re-requesting services repeatedly by only requesting them once and when the system or client is changed
    let previousSystemUrl: string | undefined;
    let previousClient: string | undefined;
    let previousService: ServiceAnswer | undefined;
    const requiredOdataVersion = promptOptions?.serviceSelection?.requiredOdataVersion;

    const systemServiceQuestion = {
        when: (): boolean =>
            connectValidator.validity.authenticated || connectValidator.validity.authRequired === false,
        name: `${promptNamespace}:${promptNames.serviceSelection}`,
        type: promptOptions?.serviceSelection?.useAutoComplete ? 'autocomplete' : 'list',
        message: () => getSelectedServiceLabel(connectValidator.connectedUserName),
        guiOptions: {
            breadcrumb: t('prompts.systemService.breadcrumb'),
            mandatory: true,
            applyDefaultWhenDirty: true
        },
        source: (prevAnswers: unknown, input: string) => searchChoices(input, serviceChoices as ListChoiceOptions[]),
        choices: async () => {
            if (
                serviceChoices.length === 0 ||
                previousSystemUrl !== connectValidator.validatedUrl ||
                previousClient !== connectValidator.validatedClient
            ) {
                // if we have a catalog, use it to list services
                if (connectValidator.catalogs[OdataVersion.v2] || connectValidator.catalogs[OdataVersion.v4]) {
                    let catalogs: CatalogService[] = [];
                    if (requiredOdataVersion && connectValidator.catalogs[requiredOdataVersion]) {
                        catalogs.push(connectValidator.catalogs[requiredOdataVersion]!);
                    } else {
                        catalogs = Object.values(connectValidator.catalogs).filter(
                            (cat) => cat !== undefined
                        ) as CatalogService[];
                    }
                    previousSystemUrl = connectValidator.validatedUrl;
                    previousClient = connectValidator.validatedClient;
                    serviceChoices = await getServiceChoices(catalogs);
                } else if (connectValidator.odataService && connectValidator.validatedUrl) {
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
                    // todo : send telemetry that we successfullly queried the services from a destination, this covers full/part url dests
                    /**
                     * const telemBasSucess = 'SERVICE_INQUIRER_BAS_SUCCESS';
                     */
                } else {
                    LoggerHelper.logger.error(t('error.noCatalogOrServiceAvailable'));
                }
            }
            return serviceChoices;
        },
        additionalMessages: (selectedService: ServiceAnswer) =>
            getSelectedServiceMessage(serviceChoices, selectedService, connectValidator, requiredOdataVersion),
        default: () => getDefaultChoiceIndex(serviceChoices as Answers[]),
        // Warning: only executes in YUI not cli
        validate: async (service: ServiceAnswer): Promise<string | boolean | ValidationLink> => {
            if (!connectValidator.validatedUrl) {
                return false;
            }
            // if no choices are available and an error is present, return the error message
            if (serviceChoices.length === 0 && errorHandler.hasError()) {
                return ErrorHandler.getHelpForError(ERROR_TYPE.SERVICES_UNAVAILABLE) ?? false;
            }
            // Dont re-request the same service details
            if (service && previousService?.servicePath !== service.servicePath) {
                previousService = service;
                return getServiceDetails(service, connectValidator, requiredOdataVersion);
            }
            return true;
        }
    } as ListQuestion<ServiceAnswer>;

    const questions: Question<ServiceAnswer>[] = [systemServiceQuestion];

    // Only for CLI use as `list` prompt validation does not run on CLI
    if (getHostEnvironment() === hostEnvironment.cli) {
        questions.push({
            when: async (answers: Answers): Promise<boolean> => {
                const selectedService = answers?.[`${promptNamespace}:${promptNames.serviceSelection}`];
                if (selectedService && connectValidator.validatedUrl) {
                    const result = await getServiceDetails(selectedService, connectValidator);
                    if (typeof result === 'string') {
                        LoggerHelper.logger.error(result);
                        throw new Error(result);
                    }
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
    return questions;
}