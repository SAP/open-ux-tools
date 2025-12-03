import type { ConfirmQuestion } from '@sap-ux/inquirer-common';
import { promptNames } from '../../../../types';
import type { ConnectionValidator } from '../../../connectionValidator';
import type { ExternalService, ExternalServiceReference } from '@sap-ux/axios-extension';
import { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { getExternalServiceReferences } from '@sap-ux/odata-service-writer';
import type { ServiceAnswer } from '../service-selection/types';
import LoggerHelper from '../../../logger-helper';
import { t } from '../../../../i18n';
import { PromptState } from '../../../../utils';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import { sendTelemetryEvent } from '@sap-ux/inquirer-common';

// Telemetry event names
const telemEventValueHelpDownloadPrompted = 'VALUE_HELP_DOWNLOAD_PROMPTED';
const telemEventValueHelpDownloadSuccess = 'VALUE_HELP_DOWNLOAD_SUCCESS';
const telemEventValueHelpDownloadFailed = 'VALUE_HELP_DOWNLOAD_FAILED';

/**
 * Create telemetry data for value help download events.
 *
 * @param params - telemetry parameters
 * @param params.valueHelpCount - count of value help items
 * @param params.userChoseToDownload - whether user chose to download
 * @param params.fetchedCount - count of fetched items
 * @param params.downloadTimeMs - download time in milliseconds
 * @param params.error - error message if download failed
 * @returns telemetry data object
 */
function createValueHelpTelemetryData(params: {
    valueHelpCount: number;
    userChoseToDownload?: boolean;
    fetchedCount?: number;
    downloadTimeMs?: number;
    error?: string;
}): Record<string, any> {
    return TelemetryHelper.createTelemetryData(params) ?? {};
}

/**
 * Get the value help download confirmation prompt.
 *
 * @param connectionValidator - connection validator instance
 * @param promptNamespace - prompt namespace
 * @param convertedMetadataRef - converted metadata reference
 * @param convertedMetadataRef.convertedMetadata - converted metadata
 * @returns value help download prompt
 */
export function getValueHelpDownloadPrompt(
    connectionValidator: ConnectionValidator,
    promptNamespace?: string,
    convertedMetadataRef?: {
        convertedMetadata: ConvertedMetadata | undefined;
    }
): ConfirmQuestion {
    const promptNamespacePart = `${promptNamespace ? promptNamespace + ':' : ''}`;
    const promptName = `${promptNamespacePart}${promptNames.valueHelpDownload}`;
    const servicePromptName = `${promptNamespacePart}${promptNames.serviceSelection}`;

    let externalServiceRefs: ExternalServiceReference[];
    let externalServiceMetadata: ExternalService[];

    const question: ConfirmQuestion = {
        when: (answers: Record<string, any> | undefined) => {
            const service = answers?.[servicePromptName] as ServiceAnswer | undefined;
            const servicePath = service?.servicePath;
            if (servicePath && convertedMetadataRef?.convertedMetadata) {
                externalServiceRefs = getExternalServiceReferences(
                    servicePath,
                    convertedMetadataRef?.convertedMetadata
                );
                return externalServiceRefs.length > 0;
            }
            return false;
        },
        name: promptName,
        type: 'confirm',
        message: t('prompts.valueHelpDownload.message'),
        validate: async (downloadMetadata: boolean) => {
            delete PromptState.odataService.valueListMetadata;

            // Send telemetry when prompt is answered
            sendTelemetryEvent(
                telemEventValueHelpDownloadPrompted,
                createValueHelpTelemetryData({
                    valueHelpCount: externalServiceRefs.length,
                    userChoseToDownload: downloadMetadata
                })
            );

            if (downloadMetadata && connectionValidator.serviceProvider instanceof AbapServiceProvider) {
                const startTime = Date.now();
                try {
                    externalServiceMetadata = await (
                        connectionValidator.serviceProvider as AbapServiceProvider
                    ).fetchExternalServices(externalServiceRefs);
                    const downloadTimeMs = Date.now() - startTime;

                    const hasExternalServiceMetadata = externalServiceMetadata.length > 0;

                    if (!hasExternalServiceMetadata) {
                        LoggerHelper.logger.info(t('warnings.noExternalServiceMetdataFetched'));
                    } else {
                        PromptState.odataService.valueListMetadata = externalServiceMetadata;
                    }

                    sendTelemetryEvent(
                        telemEventValueHelpDownloadSuccess,
                        createValueHelpTelemetryData({
                            valueHelpCount: externalServiceRefs.length,
                            userChoseToDownload: true,
                            fetchedCount: externalServiceMetadata.length,
                            downloadTimeMs
                        })
                    );
                } catch (error) {
                    const downloadTimeMs = Date.now() - startTime;
                    LoggerHelper.logger.error(`Failed to fetch external service metadata: ${error}`);
                    sendTelemetryEvent(
                        telemEventValueHelpDownloadFailed,
                        createValueHelpTelemetryData({
                            valueHelpCount: externalServiceRefs.length,
                            userChoseToDownload: true,
                            downloadTimeMs,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        })
                    );
                }
            }

            return true;
        }
    };
    return question;
}
