import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { homedir } from 'node:os';

const mockDebug = jest.fn();
jest.unstable_mockModule('../../../src/tracing/index.js', () => ({
    getLogger: () => ({ debug: mockDebug, info: jest.fn(), warn: jest.fn(), error: jest.fn() })
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
    initCliTelemetry,
    trackMigrateEvent,
    isMigrationSuccessful,
    getProjectTelemetryProperties,
    sanitizeTelemetryMessage,
    getErrorMessagesForTelemetry,
    MigrationEventName
} = await import('../../../src/cli/migrate/telemetry.js');

describe('migrate telemetry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInitTelemetrySettings.mockResolvedValue(undefined);
        mockGetTelemetrySetting.mockResolvedValue({ enableTelemetry: true });
        mockReportEventBlocking.mockResolvedValue(undefined);
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
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

        test('treats a missing setting as enabled and adds the CLI source', async () => {
            mockGetTelemetrySetting.mockResolvedValue(undefined);
            await initCliTelemetry('1.0.0');

            await trackMigrateEvent(MigrationEventName.MIGRATION_SUCCESS, { success: 'true' }, 42, '/some/project');

            expect(mockReportEventBlocking).toHaveBeenCalledWith(
                {
                    eventName: 'MIGRATION_SUCCESS',
                    properties: { success: 'true', source: 'CLI' },
                    measurements: { ms: 42 }
                },
                2,
                { appPath: '/some/project' }
            );
        });

        test('sends no measurements and helper properties when not provided', async () => {
            await initCliTelemetry('1.0.0');

            await trackMigrateEvent(MigrationEventName.MIGRATION_BACKEND_LOAD);

            expect(mockReportEventBlocking).toHaveBeenCalledWith(
                { eventName: 'MIGRATION_BACKEND_LOAD', properties: { source: 'CLI' }, measurements: {} },
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

    describe('sanitizeTelemetryMessage', () => {
        test('removes known values, URLs, paths and email addresses', () => {
            const message =
                'Failed for /Users/jane/work/my-app on host.example.com: ' +
                'https://host.example.com:44300/sap/opu/odata/srv, C:\\Projects\\app\\file.js, ' +
                `${homedir()}/x, contact jane.doe@example.com, destination MY_DEST`;

            const sanitized = sanitizeTelemetryMessage(message, [
                '/Users/jane/work/my-app',
                'MY_DEST',
                undefined,
                'ab'
            ]);

            expect(sanitized).toBe(
                'Failed for <redacted> on host.example.com: <redacted>, <redacted>, <redacted>/x, contact <redacted>, destination <redacted>'
            );
        });

        test('keeps harmless text', () => {
            expect(sanitizeTelemetryMessage('Missing property sap.app/id in manifest')).toBe(
                'Missing property sap.app/id in manifest'
            );
        });
    });

    describe('getErrorMessagesForTelemetry', () => {
        test('only reports sanitized errors, joined and limited in length', () => {
            expect(
                getErrorMessagesForTelemetry(
                    [
                        { type: 'WARNING', description: 'ignored' },
                        { type: 'ERROR', description: 'first /a/b/c' },
                        { type: 'ERROR', description: 'second' }
                    ],
                    []
                )
            ).toBe('first <redacted>,second');

            const long = getErrorMessagesForTelemetry([{ type: 'ERROR', description: 'x'.repeat(2000) }]);
            expect(long).toHaveLength(500);
        });

        test('defaults to no messages', () => {
            expect(getErrorMessagesForTelemetry()).toBe('');
        });
    });
});
