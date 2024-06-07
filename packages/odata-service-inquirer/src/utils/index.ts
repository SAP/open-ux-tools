import { isAppStudio } from '@sap-ux/btp-utils';
import type { TelemetryEvent, TelemetryProperties, ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { SampleRate } from '@sap-ux/telemetry';
import osName from 'os-name';
import { hostEnvironment } from '../types';
import { PromptState } from './prompt-state';
import { XMLParser } from 'fast-xml-parser';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import LoggerHelper from '../prompts/logger-helper';
import { t } from '../i18n';

const osVersionName = osName();

/**
 * Determine if the current prompting environment is cli or a hosted extension (app studio or vscode).
 *
 * @returns the platform name and technical name
 */
export function getHostEnvironment(): { name: string; technical: string } {
    if (!PromptState.isYUI) {
        return hostEnvironment.cli;
    } else {
        return isAppStudio() ? hostEnvironment.bas : hostEnvironment.vscode;
    }
}

let telemetryClient: ToolsSuiteTelemetryClient | undefined;

/**
 * Set the telemetry client.
 *
 * @param toolsSuiteTelemetryClient the telemetry client instance to use when sending telemetry events
 */
export function setTelemetryClient(toolsSuiteTelemetryClient: ToolsSuiteTelemetryClient | undefined): void {
    telemetryClient = toolsSuiteTelemetryClient;
}

/**
 * Send telemetry event.
 *
 * @param eventName the name of the telemetry event
 * @param telemetryData the telemetry values to report
 */
export function sendTelemetryEvent(eventName: string, telemetryData: TelemetryProperties): void {
    const telemetryEvent = createTelemetryEvent(eventName, telemetryData);
    if (telemetryClient) {
        /* eslint-disable @typescript-eslint/no-floating-promises */
        telemetryClient.reportEvent(telemetryEvent, SampleRate.NoSampling);
    }
}

/**
 * Create telemetry event.
 *
 * @param eventName the name of the telemetry event
 * @param telemetryData the telemetry values to add to he returned telemetry event
 * @returns the telemetry event
 */
function createTelemetryEvent(eventName: string, telemetryData: TelemetryProperties): TelemetryEvent {
    const telemProps: TelemetryProperties = Object.assign(telemetryData, {
        Platform: getHostEnvironment().technical,
        OperatingSystem: osVersionName
    });
    return {
        eventName,
        properties: telemProps,
        measurements: {}
    };
}

/**
 * Validate and parse the odata version from the metadata.
 *
 * @param metadata a metadata string
 * @returns the odata version of the specified metadata, throws an error if the metadata is invalid
 */
export function parseOdataVersion(metadata: string): OdataVersion {
    const options = {
        attributeNamePrefix: '',
        ignoreAttributes: false,
        ignoreNameSpace: true,
        parseAttributeValue: true,
        removeNSPrefix: true
    };
    const parser: XMLParser = new XMLParser(options);
    try {
        const parsed = parser.parse(metadata, true);
        const odataVersion: OdataVersion = parsed['Edmx']['Version'] === 1 ? OdataVersion.v2 : OdataVersion.v4;
        return odataVersion;
    } catch (error) {
        LoggerHelper.logger.error(error);
        throw new Error(t('prompts.validationMessages.metadataInvalid'));
    }
}

/**
 * Replaces the origin in the metadata URIs with a relative path.
 * The path will be tested for '/sap/opu/odata/' and if found, the origin will be replaced with './'.
 * This is to ensure that the SAP internal backend URIs are relative and that other non-SAP URIs are not affected.
 *
 * @param metadata a metadata string containing URIs which include origin (protocol, host, port)
 * @returns the metadata string with URIs replaced with relative paths
 */
export function originToRelative(metadata: string): string {
    // Regex explanation:
    // 1. Match the string "Uri=" literally
    // 2. Match either "http" or "https"
    // 3. Match the origin (protocol, host, port) as few times as possible
    // 4. Match a single forward slash, indicating the first path segment of the URL (after the origin)
    // 5. Match "sap/opu/odata" or "sap/opu/odata4" literally

    return metadata.replace(
        new RegExp(/(Uri=")(http|https):\/\/(.*?)(\/{1})(sap\/opu\/(odata\/|odata4\/))/, 'g'),
        // Retain the original path segment after the origin, matched with capture group 5 (index 4)
        (match: string, ...patterns: string[]) => `${patterns[0]}./${patterns[4]}`
    );
}

export { PromptState };
