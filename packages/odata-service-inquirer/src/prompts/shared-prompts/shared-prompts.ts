import type { ConnectionValidator } from '../connectionValidator';
import { PromptState } from '../../utils';
import type { ConfirmQuestion } from 'inquirer';
import { AbapServiceProvider, createForAbap } from '@sap-ux/axios-extension';
import LoggerHelper from '../logger-helper';
import { t } from '../../i18n';
import type { OdataServiceAnswers } from '../../types';
import { DatasourceType } from '../../types';
import type { ValueListReferenceService } from '@sap-ux/odata-service-writer';
import { getValueListReferences } from '@sap-ux/odata-service-writer';

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
    let cachedServicePath: string | undefined;
    let valueListRefsAnnotations: { target: string; rootPath: string; value: string }[] | undefined;
    const question = {
        when: () => {
            if (!!PromptState.odataService.metadata && !!PromptState.odataService.servicePath) {
                // NOTE: Re-evaluation occurs on every when() call but is acceptable for value list detection
                const valueListReferences = getValueListReferences(
                    PromptState.odataService.servicePath,
                    PromptState.odataService.metadata,
                    PromptState.odataService.annotations ?? []
                );
                valueListRefsAnnotations = valueListReferences.map((ref) => ({
                    target: ref.target,
                    rootPath: ref.serviceRootPath,
                    value: ref.value
                }));
                return valueListReferences.length > 0;
            }
            return false;
        },
        type: 'confirm',
        name: valueHelpDownloadConfirmName,
        message: t('prompts.valueHelpDownload.message'),
        default: false,
        validate: async (fetchValueHelps: boolean, answers: OdataServiceAnswers): Promise<boolean> => {
            if (
                // NOTE: System hostname checking may be needed for multi-system environments
                fetchValueHelps &&
                PromptState.odataService.servicePath !== cachedServicePath && // Dont reload unless the service has changed
                PromptState.odataService.metadata &&
                PromptState.odataService.servicePath
            ) {
                // Since odata service url prompts do not create abap service providers we need to create one
                let abapServiceProvider: AbapServiceProvider | undefined;
                if (answers.datasourceType === DatasourceType.odataServiceUrl) {
                    abapServiceProvider = createForAbap(connectionValidator.axiosConfig);
                } else if (connectionValidator.serviceProvider instanceof AbapServiceProvider) {
                    abapServiceProvider = connectionValidator.serviceProvider;
                }
                if (abapServiceProvider) {
                    cachedServicePath = PromptState.odataService.servicePath;

                    if (Array.isArray(valueListRefsAnnotations) && valueListRefsAnnotations.length > 0) {
                        const valueListReferences = await abapServiceProvider
                            .fetchValueListReferenceServices(valueListRefsAnnotations)
                            .catch(() => {
                                LoggerHelper.logger.info(t('prompts.validationMessages.noValueListReferences'));
                            });
                        // Filter out undefined entries and ensure all have required properties
                        PromptState.odataService.valueListReferences =
                            valueListReferences?.filter(
                                (ref): ref is ValueListReferenceService =>
                                    ref !== undefined && typeof ref.data === 'string' && typeof ref.path === 'string'
                            ) ?? undefined;
                    }
                }
            } else {
                cachedServicePath = undefined;
                PromptState.odataService.valueListReferences = undefined;
            }
            return true;
        }
    } as ConfirmQuestion;

    return question;
}
