import {
    ClientFactory,
    SampleRate,
    getTelemetrySetting,
    initTelemetrySettings,
    type TelemetryProperties
} from '@sap-ux/telemetry';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { ImportProjectInfo, Message } from '@sap-ux/fiori-migration-writer';
import { getFioriToolsDirectory } from '@sap-ux/store';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getLogger } from '../../tracing/index.js';
import { t } from '../../i18n.js';

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

const NOTICE_MARKER_FILE = 'create-telemetry-notice-shown';

/** How the backend system of a migration was determined. */
export type SystemResolvedVia = 'cliOption' | 'savedSystem' | 'basDestination' | 'prompt';

let telemetryEnabled = false;
// Set when sending fails or times out, so an unreachable backend delays the CLI at most once per run
let sendingFailed = false;
// Random id correlating the events of one run; it is neither persisted nor linked to a user or machine
let sessionId = randomUUID();

/**
 * Get the environment variable that opts out of telemetry, if set. Besides the variable supported by all
 * Fiori tools, the cross-tool `DO_NOT_TRACK` convention is honored.
 *
 * @returns name of the environment variable, or undefined if telemetry is not disabled by the environment
 */
export function getTelemetryOptOutEnvVariable(): string | undefined {
    if (['1', 'true'].includes(process.env.DO_NOT_TRACK?.toLowerCase() ?? '')) {
        return 'DO_NOT_TRACK';
    }
    if (process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY === 'true') {
        return 'SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY';
    }
    return undefined;
}

/**
 * Initialize the shared Fiori tools telemetry settings. Failures never affect the CLI.
 *
 * @param version - version of the create module
 */
export async function initCliTelemetry(version: string): Promise<void> {
    sendingFailed = false;
    sessionId = randomUUID();
    try {
        await initTelemetrySettings({
            consumerModule: { name: CONSUMER_MODULE_NAME, version },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false,
            resourceId: RESOURCE_ID
        });
        // Events are sent in blocking mode (the process may exit right after), which does not check the opt-out
        // setting itself, so it is resolved once here.
        telemetryEnabled = !getTelemetryOptOutEnvVariable() && (await getTelemetrySetting())?.enableTelemetry !== false;
    } catch (error) {
        telemetryEnabled = false;
        getLogger().debug(`Unable to initialize telemetry: ${(error as Error).message}`);
    }
}

/**
 * Tell the user once that usage data is collected and how to opt out. Nothing is shown if telemetry is disabled.
 * Must be called before the first event is sent.
 */
export function showTelemetryNoticeOnce(): void {
    if (!telemetryEnabled) {
        return;
    }
    try {
        const markerFile = join(getFioriToolsDirectory(), NOTICE_MARKER_FILE);
        if (existsSync(markerFile)) {
            return;
        }
        getLogger().info(t('telemetry.notice'));
        mkdirSync(getFioriToolsDirectory(), { recursive: true });
        writeFileSync(markerFile, new Date().toISOString());
    } catch (error) {
        getLogger().debug(`Unable to remember the telemetry notice: ${(error as Error).message}`);
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
        const eventProperties: TelemetryProperties = { ...properties, source: TELEMETRY_SOURCE, SessionId: sessionId };
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
 * Known error types and the patterns identifying them in migrator messages. Messages are free text that can contain
 * paths, hostnames or file names, so only the matched category is reported, never the message itself.
 */
const ERROR_CATEGORIES: Array<[category: string, pattern: RegExp]> = [
    ['floorPlanNotSupported', /floorplan is not supported/i],
    ['projectTypeNotSupported', /project type is not supported/i],
    ['projectInfoUnavailable', /cannot determine the project info/i],
    ['permissionError', /permission error|EACCES|EPERM/i],
    ['syntaxError', /syntax error/i],
    ['fileNotFound', /ENOENT|no such file|not found/i],
    ['readError', /error occurred reading|error reading/i],
    ['networkError', /ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|certificate|timed? ?out|network/i],
    ['commitFailed', /error committing migration/i],
    ['typeScriptEnablementFailed', /error enabling typescript/i],
    ['libraryCopyFailed', /error copying library files/i],
    ['commandFailed', /command failed|error code/i]
];
const UNKNOWN_ERROR_CATEGORY = 'other';

/**
 * Get the category of an error message.
 *
 * @param message - message returned by the migrator or thrown error message
 * @returns the matching category, or 'other' if the error is not known
 */
export function getErrorCategory(message: string): string {
    return ERROR_CATEGORIES.find(([, pattern]) => pattern.test(message))?.[0] ?? UNKNOWN_ERROR_CATEGORY;
}

/**
 * Get the categories of the error messages of a migration for telemetry. The IDE migration reports the error texts,
 * the CLI reports only categories because the texts can contain project specific data.
 *
 * @param messages - messages returned by the migrator
 * @returns comma separated, distinct error categories
 */
export function getErrorCategoriesForTelemetry(messages: Message[] = []): string {
    const categories = messages
        .filter((message) => message.type === 'ERROR')
        .map((message) => getErrorCategory(message.description));
    return [...new Set(categories)].join(',');
}
