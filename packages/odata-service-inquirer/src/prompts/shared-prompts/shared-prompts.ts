import type { ConnectionValidator } from '../connectionValidator';
import { PromptState } from '../../utils';
import type { ConfirmQuestion } from 'inquirer';
import { AbapServiceProvider, createForAbap } from '@sap-ux/axios-extension';
import type { ValueListReference, ExternalService, ExternalServiceReference } from '@sap-ux/axios-extension';
import LoggerHelper from '../logger-helper';
import { t } from '../../i18n';
import type { OdataServiceAnswers } from '../../types';
import { DatasourceType } from '../../types';
import { getExternalServiceReferences, OdataVersion } from '@sap-ux/odata-service-writer';

/**
 * Get the value help download prompt that appears when V4 services have value helps associated with them.
 *
 * @param connectionValidator - The connection validator instance used to access service providers and configuration
 * @param promptNamespace - The namespace for the prompt to avoid conflicts with other prompt instances
 * @returns The confirm question for value help download
 */
export function getValueHelpDownloadPrompt(
    connectionValidator: ConnectionValidator,
    promptNamespace: string
): ConfirmQuestion {
    const valueHelpDownloadConfirmName = `${promptNamespace}:valueHelpDownloadConfirm`;
    let lastProcessedServicePath: string | undefined;
    let currentValueListRefsAnnotations: ExternalServiceReference[] | undefined;

    /**
     * Helper function to detect and cache value list references for the current service.
     *
     * @returns true if value list references are found, false otherwise
     */
    const detectValueListReferences = (): boolean => {
        const currentServicePath = PromptState.odataService.servicePath;

        // Only process if we have all required data and it's a V4 service
        if (
            !PromptState.odataService.metadata ||
            !currentServicePath ||
            PromptState.odataService.odataVersion !== OdataVersion.v4
        ) {
            // Clear state for non-V4 services or missing data
            currentValueListRefsAnnotations = undefined;
            lastProcessedServicePath = undefined;
            PromptState.odataService.valueListReferences = undefined;
            return false;
        }

        // Re-process if service changed or not yet processed
        if (lastProcessedServicePath !== currentServicePath) {
            const valueListReferences = getExternalServiceReferences(
                currentServicePath,
                PromptState.odataService.metadata,
                PromptState.odataService.annotations ?? []
            );
            currentValueListRefsAnnotations = valueListReferences;

            lastProcessedServicePath = currentServicePath;
            // Clear any stale value list references when service changes
            PromptState.odataService.valueListReferences = undefined;

            return valueListReferences.length > 0;
        }

        // Return cached result
        return !!currentValueListRefsAnnotations && currentValueListRefsAnnotations.length > 0;
    };

    const question = {
        when: (_answers: OdataServiceAnswers) => {
            return detectValueListReferences();
        },
        type: 'confirm',
        name: valueHelpDownloadConfirmName,
        message: t('prompts.valueHelpDownload.message'),
        default: false,
        validate: async (fetchValueHelps: boolean, answers: OdataServiceAnswers): Promise<boolean> => {
            if (
                // NOTE: System hostname checking may be needed for multi-system environments
                fetchValueHelps &&
                PromptState.odataService.servicePath !== lastProcessedServicePath && // Dont reload unless the service has changed
                PromptState.odataService.metadata &&
                PromptState.odataService.servicePath
            ) {
                // Check if we have value list references for this service
                if (detectValueListReferences() && currentValueListRefsAnnotations) {
                    // Best effort attempt to get value list references but don't throw an error if it fails as this may not be an ABAP system
                    try {
                        // Since odata service url prompts do not create abap service providers we need to create one
                        let abapServiceProvider: AbapServiceProvider | undefined;
                        if (answers.datasourceType === DatasourceType.odataServiceUrl) {
                            abapServiceProvider = createForAbap(connectionValidator.axiosConfig);
                        } else if (connectionValidator.serviceProvider instanceof AbapServiceProvider) {
                            abapServiceProvider = connectionValidator.serviceProvider;
                        }
                        if (abapServiceProvider) {
                            lastProcessedServicePath = PromptState.odataService.servicePath;

                            const valueListReferences = await abapServiceProvider
                                .fetchExternalServices(currentValueListRefsAnnotations)
                                .catch(() => {
                                    LoggerHelper.logger.info(t('prompts.validationMessages.noValueListReferences'));
                                    return undefined;
                                });
                            // Backend already filters out invalid entries and ensures data is always present
                            PromptState.odataService.valueListReferences = valueListReferences;
                        }
                    } catch (err) {
                        LoggerHelper.logger.info(
                            'Failed to fetch value list references - this may not be an ABAP system'
                        );
                        PromptState.odataService.valueListReferences = undefined;
                    }
                }
            } else {
                lastProcessedServicePath = undefined;
                currentValueListRefsAnnotations = undefined;
                PromptState.odataService.valueListReferences = undefined;
            }
            return true;
        }
    } as ConfirmQuestion;

    return question;
}
