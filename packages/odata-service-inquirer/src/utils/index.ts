import type { TelemetryEvent, TelemetryProperties, ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { SampleRate } from '@sap-ux/telemetry';
import { getHostEnvironment } from '@sap-ux/fiori-generator-shared';
import osName from 'os-name';
import { PromptState } from './prompt-state';
import { XMLParser } from 'fast-xml-parser';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import LoggerHelper from '../prompts/logger-helper';
import { t } from '../i18n';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { ListChoiceOptions } from 'inquirer';

const osVersionName = osName();

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
 * Validate xml and parse the odata version from the metadata xml.
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
        new RegExp(/(Uri=")(http|https):\/{2}(.*?)(\/)(sap\/opu\/(odata\/|odata4\/))/, 'g'),
        // Retain the original path segment after the origin, matched with capture group 5 (index 4)
        (match: string, ...patterns: string[]) => `${patterns[0]}./${patterns[4]}`
    );
}

/**
 * Convert the odata version type from the prompt (odata-service-writer) type to the axios-extension type.
 *
 * @param odataVersion The odata version to convert
 * @returns The converted odata version
 */
export function convertODataVersionType(odataVersion?: OdataVersion): ODataVersion | undefined {
    if (!odataVersion) {
        return undefined;
    }
    return odataVersion === OdataVersion.v2 ? ODataVersion.v2 : ODataVersion.v4;
}

/**
 * Gets the default index for a list of items, used to default list prompts to the first item if only one item is available.
 * If list is undefined or has more than one, returns undefined which will default to the 'please select' message.
 *
 * @param list the list of choices
 * @returns the default index if only one item is available, otherwise undefined
 */
export function getDefaultChoiceIndex(list: ListChoiceOptions[]): number | undefined {
    if (list?.length === 1) {
        return 0;
    }

    return undefined;
}

export { PromptState };
