import {
    ClientFactory,
    SampleRate,
    getTelemetrySetting,
    initTelemetrySettings,
    type TelemetryProperties
} from '@sap-ux/telemetry';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { ImportProjectInfo, Message } from '@sap-ux/fiori-migration-writer';
import { homedir } from 'node:os';
import { getLogger } from '../../tracing/index.js';

/**
 * Event names shared with the migration events fired by the application modeler (IDE extension).
 */
export const MigrationEventName = {
    MIGRATION_BACKEND_LOAD: 'MIGRATION_BACKEND_LOAD',
    MIGRATION_COMPLETED: 'MIGRATION_COMPLETED',
    MIGRATION_SUCCESS: 'MIGRATION_SUCCESS',
    MIGRATION_FAILED: 'MIGRATION_FAILED'
} as const;
export type MigrationEventName = (typeof MigrationEventName)[keyof typeof MigrationEventName];

/** Distinguishes events fired by the CLI from the ones fired by the IDE extension. */
export const TELEMETRY_SOURCE = 'CLI';

const CONSUMER_MODULE_NAME = '@sap-ux/create';
// Replaced with the real key when the module is built for release
const RESOURCE_ID = 'ApplicationInsightsInstrumentationKeyPLACEH0LDER';
// Upper bound for sending an event, so an unreachable backend never blocks the CLI for long
const SEND_TIMEOUT_MS = 3000;

const REDACTED = '<redacted>';
const MAX_MESSAGES_LENGTH = 500;

/** How the backend system of a migration was determined. */
export type SystemResolvedVia = 'cliOption' | 'savedSystem' | 'basDestination' | 'prompt';

let telemetryEnabled = false;
// Set when sending fails or times out, so an unreachable backend delays the CLI at most once per run
let sendingFailed = false;

/**
 * Initialize the shared Fiori tools telemetry settings. Failures never affect the CLI.
 *
 * @param version - version of the create module
 */
export async function initCliTelemetry(version: string): Promise<void> {
    sendingFailed = false;
    try {
        await initTelemetrySettings({
            consumerModule: { name: CONSUMER_MODULE_NAME, version },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false,
            resourceId: RESOURCE_ID
        });
        // Events are sent in blocking mode (the process may exit right after), which does not check the opt-out
        // setting itself, so it is resolved once here.
        telemetryEnabled = (await getTelemetrySetting())?.enableTelemetry !== false;
    } catch (error) {
        telemetryEnabled = false;
        getLogger().debug(`Unable to initialize telemetry: ${(error as Error).message}`);
    }
}

/**
 * Send a migration telemetry event. Does nothing if telemetry is disabled and never throws.
 *
 * @param eventName - name of the event
 * @param properties - event properties; must not contain personal data such as paths, hostnames or system names
 * @param ms - optional duration in milliseconds
 * @param appPath - optional project path, only used to derive common project properties and never sent as such
 */
export async function trackMigrateEvent(
    eventName: MigrationEventName,
    properties: Record<string, string> = {},
    ms?: number,
    appPath?: string
): Promise<void> {
    if (!telemetryEnabled || sendingFailed) {
        return;
    }
    let timer: NodeJS.Timeout | undefined;
    try {
        const timeout = new Promise<'timeout'>((resolve) => {
            timer = setTimeout(() => resolve('timeout'), SEND_TIMEOUT_MS);
        });
        const eventProperties: TelemetryProperties = { ...properties, source: TELEMETRY_SOURCE };
        const send = ClientFactory.getTelemetryClient()
            .reportEventBlocking(
                { eventName, properties: eventProperties, measurements: ms === undefined ? {} : { ms } },
                SampleRate.NoSampling,
                appPath ? { appPath } : undefined
            )
            .then(() => 'sent' as const);
        if ((await Promise.race([send, timeout])) === 'timeout') {
            sendingFailed = true;
            getLogger().debug(`Telemetry event ${eventName} timed out, no further events are sent`);
        }
    } catch (error) {
        sendingFailed = true;
        getLogger().debug(`Unable to send telemetry event ${eventName}: ${(error as Error).message}`);
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Mirrors the status determination of the IDE migration: a run is only successful if the migration completed
 * and did not report error messages.
 *
 * @param result - result flag returned by the migrator
 * @param messages - messages returned by the migrator
 * @returns true if the migration is to be reported as successful
 */
export function isMigrationSuccessful(result: boolean, messages: Message[] = []): boolean {
    return result && !messages.some((message) => message.type === 'ERROR');
}

/**
 * Get the project properties of a migration event, using the same property names as the IDE migration.
 *
 * @param projectInfo - information read from the legacy project
 * @param ui5Version - UI5 version requested for the migration, if any
 * @returns telemetry properties without personal data
 */
export function getProjectTelemetryProperties(
    projectInfo: ImportProjectInfo | undefined,
    ui5Version?: string
): Record<string, string> {
    return {
        floorPlan: projectInfo?.floorPlan ?? '',
        ui5Theme: projectInfo?.ui5Theme ?? '',
        ui5Version: ui5Version ?? projectInfo?.ui5Version ?? '',
        ODataVersion: projectInfo?.odataVersion ?? '',
        numReuseLibs: String(projectInfo?.reuseLibs ? projectInfo.reuseLibs.split(',').length : 0),
        type: projectInfo?.type ?? ''
    };
}

/**
 * Remove values that could identify a project, a user or a system from a message.
 *
 * @param message - message to sanitize
 * @param sensitiveValues - known values (e.g. project path, hostname, destination) to remove
 * @returns sanitized message
 */
export function sanitizeTelemetryMessage(message: string, sensitiveValues: Array<string | undefined> = []): string {
    const knownValues = [...sensitiveValues, homedir()]
        .filter((value): value is string => !!value && value.length >= 3)
        .sort((a, b) => b.length - a.length);
    let sanitized = message;
    for (const value of knownValues) {
        sanitized = sanitized.split(value).join(REDACTED);
    }
    return sanitized
        .replaceAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, REDACTED)
        .replaceAll(/[a-z][a-z\d+.-]*:\/\/[^\s'"`,;)]+/gi, REDACTED)
        .replaceAll(/[a-z]:[\\/][^\s'"`,;)]*/gi, REDACTED)
        .replaceAll(/(?<![\w.:>])(?:\/[\w.@~+-]+){2,}/g, REDACTED);
}

/**
 * Get the error messages of a migration for telemetry. Same as in the IDE migration only errors are reported,
 * but values that could identify the project or system are removed.
 *
 * @param messages - messages returned by the migrator
 * @param sensitiveValues - known values (e.g. project path, hostname, destination) to remove
 * @returns comma separated and length limited error messages
 */
export function getErrorMessagesForTelemetry(
    messages: Message[] = [],
    sensitiveValues: Array<string | undefined> = []
): string {
    return messages
        .filter((message) => message.type === 'ERROR')
        .map((message) => sanitizeTelemetryMessage(message.description, sensitiveValues))
        .join(',')
        .slice(0, MAX_MESSAGES_LENGTH);
}
