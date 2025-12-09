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
 * Create telemetry data for value help download events.
 * Separates measurements (numeric values) from properties (dimensions).
 *
 * @param params - telemetry parameters
 * @param params.valueHelpCount - count of value help items
 * @param params.userChoseToDownload - whether user chose to download
 * @param params.fetchedCount - count of fetched items
 * @param params.downloadTimeMs - download time in milliseconds
 * @param params.error - error message if download failed
 * @returns telemetry data object with properties and measurements
 */
function createValueHelpTelemetryData(params: {
    valueHelpCount: number;
    userChoseToDownload?: boolean;
    fetchedCount?: number;
    downloadTimeMs?: number;
    error?: string;
}): { properties: Record<string, any>; measurements: Record<string, number> } {
    // Build property object for TelemetryHelper
    const propertyData: Record<string, any> = {
        valueHelpCount: params.valueHelpCount
    };
    if (params.userChoseToDownload !== undefined) {
        propertyData.userChoseToDownload = params.userChoseToDownload;
    }
    if (params.error !== undefined) {
        propertyData.error = params.error;
    }

    // Use TelemetryHelper to add standard properties (Platform, OperatingSystem, etc.)
    const properties = TelemetryHelper.createTelemetryData(propertyData) ?? {};

    // Build measurements object for numeric metrics
    const measurements: Record<string, number> = {};
    if (params.fetchedCount !== undefined) {
        measurements.fetchedCount = params.fetchedCount;
    }
    if (params.downloadTimeMs !== undefined) {
        measurements.downloadTimeMs = params.downloadTimeMs;
    }

    return { properties, measurements };
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
            const telemetryData = createValueHelpTelemetryData({
                valueHelpCount: externalServiceRefs.length,
                userChoseToDownload: downloadMetadata
            });
            sendTelemetryEvent(telemEventValueHelpDownloadPrompted, telemetryData.properties);

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

                    // Send telemetry with measurements for numeric metrics
                    const telemetryData = createValueHelpTelemetryData({
                        valueHelpCount: externalServiceRefs.length,
                        userChoseToDownload: true,
                        fetchedCount: externalServiceMetadata.length,
                        downloadTimeMs
                    });
                    const telemetryClient = getTelemetryClient();
                    if (telemetryClient) {
                        await telemetryClient.reportEvent(
                            {
                                eventName: telemEventValueHelpDownloadSuccess,
                                properties: telemetryData.properties,
                                measurements: telemetryData.measurements
                            },
                            SampleRate.NoSampling
                        );
                    }
                } catch (error) {
                    const downloadTimeMs = Date.now() - startTime;
                    LoggerHelper.logger.error(`Failed to fetch external service metadata: ${error}`);
                    // Send telemetry with measurements for numeric metrics
                    const telemetryData = createValueHelpTelemetryData({
                        valueHelpCount: externalServiceRefs.length,
                        userChoseToDownload: true,
                        downloadTimeMs,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    const telemetryClient = getTelemetryClient();
                    if (telemetryClient) {
                        await telemetryClient.reportEvent(
                            {
                                eventName: telemEventValueHelpDownloadFailed,
                                properties: telemetryData.properties,
                                measurements: telemetryData.measurements
                            },
                            SampleRate.NoSampling
                        );
                    }
                }
            }

            return true;
        }
    };
    return question;
}
