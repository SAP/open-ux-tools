import type { ConfirmQuestion } from '@sap-ux/inquirer-common';
import { sendTelemetryEvent, getTelemetryClient } from '@sap-ux/inquirer-common';
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
import { SampleRate } from '@sap-ux/telemetry';

// Telemetry event names
const telemEventValueHelpDownloadPrompted = 'VALUE_HELP_DOWNLOAD_PROMPTED';
const telemEventValueHelpDownloadSuccess = 'VALUE_HELP_DOWNLOAD_SUCCESS';
const telemEventValueHelpDownloadFailed = 'VALUE_HELP_DOWNLOAD_FAILED';

/**
 * Send telemetry event with optional measurements support.
 *
 * @param eventName - telemetry event name
 * @param properties - telemetry properties (dimensions)
 * @param measurements - optional telemetry measurements (numeric metrics)
 */
async function sendValueHelpTelemetry(
    eventName: string,
    properties: Record<string, any>,
    measurements?: Record<string, number>
): Promise<void> {
    // Use TelemetryHelper to add standard properties (Platform, OperatingSystem, etc.)
    const enrichedProperties = TelemetryHelper.createTelemetryData(properties) ?? {};

    if (measurements && Object.keys(measurements).length > 0) {
        // Use reportEvent for events with measurements
        const telemetryClient = getTelemetryClient();
        if (telemetryClient) {
            await telemetryClient.reportEvent(
                {
                    eventName,
                    properties: enrichedProperties,
                    measurements
                },
                SampleRate.NoSampling
            );
        }
    } else {
        // Use sendTelemetryEvent for simple events without measurements
        sendTelemetryEvent(eventName, enrichedProperties);
    }
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
            await sendValueHelpTelemetry(telemEventValueHelpDownloadPrompted, {
                userChoseToDownload: downloadMetadata
            });

            if (downloadMetadata && connectionValidator.serviceProvider instanceof AbapServiceProvider) {
                const startTime = Date.now();
                try {
                    externalServiceMetadata = await (
                        connectionValidator.serviceProvider as AbapServiceProvider
                    ).fetchExternalServices(externalServiceRefs);
                    const downloadTimeMs = Date.now() - startTime;

                    if (externalServiceMetadata.length > 0) {
                        PromptState.odataService.valueListMetadata = externalServiceMetadata;
                    } else {
                        LoggerHelper.logger.info(t('warnings.noExternalServiceMetdataFetched'));
                    }

                    // Send success telemetry with measurements
                    await sendValueHelpTelemetry(
                        telemEventValueHelpDownloadSuccess,
                        {
                            userChoseToDownload: true,
                            valueHelpCount: externalServiceMetadata.length
                        },
                        { downloadTimeMs }
                    );
                } catch (error) {
                    const downloadTimeMs = Date.now() - startTime;
                    LoggerHelper.logger.error(`Failed to fetch external service metadata: ${error}`);

                    // Send failure telemetry with measurements
                    await sendValueHelpTelemetry(
                        telemEventValueHelpDownloadFailed,
                        {
                            userChoseToDownload: true,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        },
                        { downloadTimeMs }
                    );
                }
            }

            return true;
        }
    };
    return question;
}
