import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let toolsDirectory = '';
let tempDirectory = '';
jest.unstable_mockModule('@sap-ux/store', () => ({
    getFioriToolsDirectory: () => toolsDirectory
}));

jest.unstable_mockModule('../../../src/i18n.js', () => ({
    t: (key: string) => key
}));

const mockDebug = jest.fn();
const mockInfo = jest.fn();
jest.unstable_mockModule('../../../src/tracing/index.js', () => ({
    getLogger: () => ({ debug: mockDebug, info: mockInfo, warn: jest.fn(), error: jest.fn() })
}));

const mockInitTelemetrySettings = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<void>>;
const mockGetTelemetrySetting = jest.fn() as jest.Mock<() => Promise<{ enableTelemetry: boolean } | undefined>>;
const mockReportEventBlocking = jest.fn() as jest.Mock<(...args: unknown[]) => Promise<void>>;
jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ClientFactory: { getTelemetryClient: () => ({ reportEventBlocking: mockReportEventBlocking }) },
    SampleRate: { NoSampling: 2 },
    initTelemetrySettings: (...args: unknown[]) => mockInitTelemetrySettings(...args),
    getTelemetrySetting: () => mockGetTelemetrySetting()
}));

const mockIsInternalFeaturesSettingEnabled = jest.fn() as jest.Mock<() => boolean>;
jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: () => mockIsInternalFeaturesSettingEnabled()
}));

const {
    getTelemetryOptOutEnvVariable,
    showTelemetryNoticeOnce,
    initCliTelemetry,
    trackMigrateEvent,
    isMigrationSuccessful,
    getProjectTelemetryProperties,
    getErrorCategory,
    getErrorCategoriesForTelemetry,
    MigrationEventName
} = await import('../../../src/cli/migrate/telemetry.js');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('migrate telemetry', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.DO_NOT_TRACK;
        delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
        tempDirectory = mkdtempSync(join(tmpdir(), 'create-telemetry-'));
        toolsDirectory = tempDirectory;
        jest.clearAllMocks();
        mockInitTelemetrySettings.mockResolvedValue(undefined);
        mockGetTelemetrySetting.mockResolvedValue({ enableTelemetry: true });
        mockReportEventBlocking.mockResolvedValue(undefined);
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        rmSync(tempDirectory, { recursive: true, force: true });
    });

    describe('getTelemetryOptOutEnvVariable', () => {
        test.each([
            [{}, undefined],
            [{ DO_NOT_TRACK: '1' }, 'DO_NOT_TRACK'],
            [{ DO_NOT_TRACK: 'TRUE' }, 'DO_NOT_TRACK'],
            [{ DO_NOT_TRACK: '0' }, undefined],
            [{ DO_NOT_TRACK: '' }, undefined],
            [{ SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY: 'true' }, 'SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY'],
            [{ SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY: 'false' }, undefined]
        ])('%j -> %s', (env, expected) => {
            Object.assign(process.env, env);
            expect(getTelemetryOptOutEnvVariable()).toBe(expected);
        });
    });

    describe('opt-out by environment', () => {
        test.each([
            ['DO_NOT_TRACK', '1'],
            ['SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY', 'true']
        ])('%s disables events and the notice', async (variable, value) => {
            process.env[variable] = value;
            await initCliTelemetry('1.0.0');

            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);
            showTelemetryNoticeOnce();

            expect(mockReportEventBlocking).not.toHaveBeenCalled();
            expect(mockInfo).not.toHaveBeenCalled();
        });
    });

    describe('showTelemetryNoticeOnce', () => {
        test('shows the notice only once', async () => {
            await initCliTelemetry('1.0.0');

            showTelemetryNoticeOnce();
            showTelemetryNoticeOnce();

            expect(mockInfo).toHaveBeenCalledTimes(1);
            expect(mockInfo).toHaveBeenCalledWith('telemetry.notice');
            expect(readdirSync(toolsDirectory)).toEqual(['create-telemetry-notice-shown']);
        });

        test('does not show the notice when telemetry is disabled', async () => {
            mockGetTelemetrySetting.mockResolvedValue({ enableTelemetry: false });
            await initCliTelemetry('1.0.0');

            showTelemetryNoticeOnce();

            expect(mockInfo).not.toHaveBeenCalled();
            expect(existsSync(join(toolsDirectory, 'create-telemetry-notice-shown'))).toBe(false);
        });

        test('does not repeat the notice when it was shown before', async () => {
            await initCliTelemetry('1.0.0');
            writeFileSync(join(toolsDirectory, 'create-telemetry-notice-shown'), '');

            showTelemetryNoticeOnce();

            expect(mockInfo).not.toHaveBeenCalled();
        });

        test('does not throw when the marker cannot be written', async () => {
            await initCliTelemetry('1.0.0');
            // a file in place of the tools directory makes creating the marker fail
            const blocker = join(toolsDirectory, 'blocker');
            writeFileSync(blocker, '');
            toolsDirectory = join(blocker, 'nested');

            expect(() => showTelemetryNoticeOnce()).not.toThrow();
            expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('telemetry notice'));
        });
    });

    describe('initCliTelemetry', () => {
        test('initializes the shared telemetry settings', async () => {
            mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);

            await initCliTelemetry('1.2.3');

            expect(mockInitTelemetrySettings).toHaveBeenCalledWith({
                consumerModule: { name: '@sap-ux/create', version: '1.2.3' },
                internalFeature: true,
                watchTelemetrySettingStore: false,
                resourceId: expect.any(String)
            });
        });

        test('does not throw and disables events when initialization fails', async () => {
            mockInitTelemetrySettings.mockRejectedValue(new Error('store unavailable'));

            await expect(initCliTelemetry('1.2.3')).resolves.toBeUndefined();
            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);

            expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('store unavailable'));
            expect(mockReportEventBlocking).not.toHaveBeenCalled();
        });
    });

    describe('trackMigrateEvent', () => {
        test('does nothing before telemetry is initialized or when it is disabled', async () => {
            mockGetTelemetrySetting.mockResolvedValue({ enableTelemetry: false });
            await initCliTelemetry('1.0.0');

            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED, { a: 'b' }, 1);

            expect(mockReportEventBlocking).not.toHaveBeenCalled();
        });

        test('treats a missing setting as disabled (fail closed) to avoid sending without verified consent', async () => {
            mockGetTelemetrySetting.mockResolvedValue(undefined);
            await initCliTelemetry('1.0.0');

            await trackMigrateEvent(MigrationEventName.MIGRATION_SUCCESS, { success: 'true' }, 42, '/some/project');

            // Should not send events when setting cannot be read (fail closed)
            expect(mockReportEventBlocking).not.toHaveBeenCalled();
        });

        test('sends no measurements and helper properties when not provided', async () => {
            await initCliTelemetry('1.0.0');

            await trackMigrateEvent(MigrationEventName.MIGRATION_BACKEND_LOAD);

            expect(mockReportEventBlocking).toHaveBeenCalledWith(
                {
                    eventName: 'MIGRATION_BACKEND_LOAD',
                    properties: { source: 'CLI', SessionId: expect.stringMatching(UUID) },
                    measurements: {}
                },
                2,
                undefined
            );
        });

        test('does not wait longer than the timeout for an unresponsive backend', async () => {
            jest.useFakeTimers();
            try {
                await initCliTelemetry('1.0.0');
                mockReportEventBlocking.mockReturnValue(new Promise(() => undefined));

                const tracked = trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);
                await jest.advanceTimersByTimeAsync(3000);

                await expect(tracked).resolves.toBeUndefined();
            } finally {
                jest.useRealTimers();
            }
        });

        test('stops sending further events after a timeout', async () => {
            jest.useFakeTimers();
            try {
                await initCliTelemetry('1.0.0');
                mockReportEventBlocking.mockReturnValue(new Promise(() => undefined));

                const first = trackMigrateEvent(MigrationEventName.MIGRATION_BACKEND_LOAD);
                await jest.advanceTimersByTimeAsync(3000);
                await first;
                await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);

                expect(mockReportEventBlocking).toHaveBeenCalledTimes(1);
            } finally {
                jest.useRealTimers();
            }
        });

        test('stops sending further events after a failure and resumes after re-initialization', async () => {
            await initCliTelemetry('1.0.0');
            mockReportEventBlocking.mockRejectedValueOnce(new Error('offline'));

            await trackMigrateEvent(MigrationEventName.MIGRATION_BACKEND_LOAD);
            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);
            expect(mockReportEventBlocking).toHaveBeenCalledTimes(1);

            await initCliTelemetry('1.0.0');
            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);
            expect(mockReportEventBlocking).toHaveBeenCalledTimes(2);
        });

        test('uses one session id per run and a new one after re-initialization', async () => {
            const getSessionIds = (): string[] =>
                mockReportEventBlocking.mock.calls.map(
                    (call) => (call[0] as { properties: { SessionId: string } }).properties.SessionId
                );
            await initCliTelemetry('1.0.0');
            await trackMigrateEvent(MigrationEventName.MIGRATION_BACKEND_LOAD);
            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);
            await initCliTelemetry('1.0.0');
            await trackMigrateEvent(MigrationEventName.MIGRATION_COMPLETED);

            const [first, second, third] = getSessionIds();
            expect(first).toBe(second);
            expect(third).not.toBe(first);
        });

        test('never throws when sending fails', async () => {
            await initCliTelemetry('1.0.0');
            mockReportEventBlocking.mockRejectedValue(new Error('offline'));

            await expect(trackMigrateEvent(MigrationEventName.MIGRATION_FAILED)).resolves.toBeUndefined();
            expect(mockDebug).toHaveBeenCalledWith(expect.stringContaining('offline'));
        });
    });

    describe('isMigrationSuccessful', () => {
        test.each([
            [true, [], true],
            [true, [{ type: 'WARNING', description: 'w' }], true],
            [true, [{ type: 'ERROR', description: 'e' }], false],
            [false, [], false]
        ] as const)('result %s with messages %j -> %s', (result, messages, expected) => {
            expect(isMigrationSuccessful(result, [...messages])).toBe(expected);
        });

        test('defaults to no messages', () => {
            expect(isMigrationSuccessful(true)).toBe(true);
        });
    });

    describe('getProjectTelemetryProperties', () => {
        test('maps project info to the IDE property names', () => {
            expect(
                getProjectTelemetryProperties({
                    floorPlan: 'V4_LIST_REPORT',
                    ui5Theme: 'sap_horizon',
                    ui5Version: '1.120.0',
                    odataVersion: '4.0',
                    reuseLibs: 'a,b,c',
                    type: 'application'
                } as never)
            ).toEqual({
                floorPlan: 'V4_LIST_REPORT',
                ui5Theme: 'sap_horizon',
                ui5Version: '1.120.0',
                ODataVersion: '4.0',
                numReuseLibs: '3',
                type: 'application'
            });
        });

        test('prefers the requested UI5 version', () => {
            expect(getProjectTelemetryProperties({ ui5Version: '1.100.0' } as never, '1.130.0').ui5Version).toBe(
                '1.130.0'
            );
        });

        test('falls back to empty values', () => {
            expect(getProjectTelemetryProperties(undefined)).toEqual({
                floorPlan: '',
                ui5Theme: '',
                ui5Version: '',
                ODataVersion: '',
                numReuseLibs: '0',
                type: ''
            });
        });
    });

    describe('getErrorCategory', () => {
        describe('with error code (preferred)', () => {
            test.each([
                [{ type: 'ERROR', description: 'File not found', code: 'ENOENT' }, 'fileNotFound'],
                [{ type: 'ERROR', description: 'Permission denied', code: 'EACCES' }, 'permissionError'],
                [{ type: 'ERROR', description: 'Permission denied', code: 'EPERM' }, 'permissionError'],
                [{ type: 'ERROR', description: 'Invalid JSON', code: 'JSON_PARSE_ERROR' }, 'syntaxError'],
                [{ type: 'ERROR', description: 'Invalid manifest', code: 'MANIFEST_PARSE_ERROR' }, 'syntaxError'],
                [{ type: 'ERROR', description: 'Unsupported floorplan', code: 'UNSUPPORTED_FLOORPLAN' }, 'floorPlanNotSupported'],
                [{ type: 'ERROR', description: 'Project not suitable', code: 'NOT_SUITABLE_FOR_MIGRATION' }, 'projectTypeNotSupported'],
                [{ type: 'ERROR', description: 'Failed to get info', code: 'PROJECT_INFO_FAILED' }, 'projectInfoUnavailable'],
                [{ type: 'ERROR', description: 'Commit failed', code: 'COMMIT_FAILED' }, 'commitFailed'],
                [{ type: 'ERROR', description: 'TypeScript setup failed', code: 'TYPESCRIPT_SETUP_FAILED' }, 'typeScriptEnablementFailed'],
                [{ type: 'ERROR', description: 'Copy failed', code: 'COPY_FILES_FAILED' }, 'libraryCopyFailed'],
                [{ type: 'ERROR', description: 'Template error', code: 'TEMPLATE_GENERATION_FAILED' }, 'templateGenerationFailed'],
                [{ type: 'ERROR', description: 'Unknown error', code: 'UNKNOWN_ERROR' }, 'other']
            ])('%j -> %s', (message, category) => {
                expect(getErrorCategory(message)).toBe(category);
            });
        });

        describe('with string message (fallback to regex)', () => {
            test.each([
                ['The V2_ANALYTICAL floorplan is not supported for migration.', 'floorPlanNotSupported'],
                ['This project type is not supported for migration.', 'projectTypeNotSupported'],
                ['Cannot determine the project info for the selected project.', 'projectInfoUnavailable'],
                ['A permission error occurred in /Users/jane/app/manifest.json.', 'permissionError'],
                ["EACCES: permission denied, open '/Users/jane/app/file'", 'permissionError'],
                ['A syntax error occurred in manifest.json. Ensure the file is valid.', 'syntaxError'],
                ["ENOENT: no such file or directory, open '/Users/jane/app/x'", 'fileNotFound'],
                ['An error occurred reading the webapp/manifest.json file.', 'readError'],
                ['connect ECONNREFUSED 10.0.0.1:443', 'networkError'],
                ['Error during migration: self-signed certificate', 'networkError'],
                ['Error committing migration: disk full', 'commitFailed'],
                ['Error enabling TypeScript: failed', 'typeScriptEnablementFailed'],
                ['Error copying library files: failed', 'libraryCopyFailed'],
                ['The npm command failed with the 1 error code.', 'commandFailed'],
                ['Something customer specific happened at https://host.example.com', 'other']
            ])('%s -> %s', (message, category) => {
                expect(getErrorCategory(message)).toBe(category);
            });
        });

        describe('with message object without code (fallback to regex)', () => {
            test('falls back to description matching when code is not present', () => {
                const message = { type: 'ERROR', description: 'ENOENT: no such file' };
                expect(getErrorCategory(message)).toBe('fileNotFound');
            });
        });
    });

    describe('getErrorCategoriesForTelemetry', () => {
        test('prefers error codes when available', () => {
            const categories = getErrorCategoriesForTelemetry([
                { type: 'ERROR', description: 'File not found at /secret/path', code: 'ENOENT' },
                { type: 'ERROR', description: 'Permission denied for /jane/file', code: 'EACCES' },
                { type: 'ERROR', description: 'Unsupported floorplan V2_ANALYTICAL', code: 'UNSUPPORTED_FLOORPLAN' }
            ]);

            expect(categories).toBe('fileNotFound,permissionError,floorPlanNotSupported');
            expect(categories).not.toMatch(/secret|jane|V2_ANALYTICAL/);
        });

        test('falls back to regex when code is not available', () => {
            const categories = getErrorCategoriesForTelemetry([
                { type: 'ERROR', description: 'A syntax error occurred in /Users/jane/secret/manifest.json.' },
                { type: 'ERROR', description: 'The V2_ANALYTICAL floorplan is not supported for migration.' }
            ]);

            expect(categories).toBe('syntaxError,floorPlanNotSupported');
            expect(categories).not.toMatch(/jane|secret/);
        });

        test('reports only distinct categories of errors and never the message text', () => {
            const categories = getErrorCategoriesForTelemetry([
                { type: 'WARNING', description: 'A syntax error occurred.' },
                { type: 'ERROR', description: 'A syntax error occurred in /Users/jane/secret/manifest.json.' },
                { type: 'ERROR', description: 'A syntax error occurred in other.json.' },
                { type: 'ERROR', description: 'The V2_ANALYTICAL floorplan is not supported for migration.' },
                { type: 'ERROR', description: 'Failure at https://host.example.com' }
            ]);

            expect(categories).toBe('syntaxError,floorPlanNotSupported,other');
            expect(categories).not.toMatch(/jane|secret|example/);
        });

        test('defaults to no messages', () => {
            expect(getErrorCategoriesForTelemetry()).toBe('');
        });
    });
});
