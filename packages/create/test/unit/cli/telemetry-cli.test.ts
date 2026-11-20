import { jest, describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import * as actualOs from 'node:os';
import { join } from 'node:path';

/**
 * Runs the `telemetry` command through the real CLI entry point with the real store and telemetry modules.
 * Only the logger is replaced and the home directory points to a temporary folder, so nothing on the machine of
 * the developer is read or written.
 */
const originalEnv = { ...process.env };
const homeDirectory = mkdtempSync(join(actualOs.tmpdir(), 'create-telemetry-cli-'));
// Setting HOME in the Jest sandbox does not change what `os.homedir()` returns, so it has to be mocked
jest.unstable_mockModule('node:os', () => ({
    ...actualOs,
    default: { ...actualOs, homedir: () => homeDirectory },
    homedir: () => homeDirectory
}));

const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
// Changing the setting reports an event, which must not leave the test
const mockTrackEvent = jest.fn();
jest.unstable_mockModule('applicationinsights', () => {
    class TelemetryClient {
        public config = { samplingPercentage: 100 };
        public context = { tags: {} };
        public setUseDiskRetryCaching = jest.fn();
        public trackEvent = (event: unknown) => mockTrackEvent(event);
        public flush = jest.fn();
    }
    return { TelemetryClient };
});

const actualTracing = await import('../../../src/tracing/index.js');
jest.unstable_mockModule('../../../src/tracing/index.js', () => ({
    ...actualTracing,
    getLogger: () => mockLogger
}));

const { getFioriToolsDirectory } = await import('@sap-ux/store');
const { handleCreateFioriCommand } = await import('../../../src/cli/index.js');

const settingsFile = join(homeDirectory, '.fioritools', 'telemetrysettings.json');
const readEnableTelemetry = (): boolean =>
    JSON.parse(readFileSync(settingsFile, 'utf-8')).telemetrysettings.telemetrySetting.enableTelemetry;
const run = async (...args: string[]): Promise<void> => handleCreateFioriCommand(['node', 'sap-ux', ...args]);
const getInfoMessages = (): string[] => mockLogger.info.mock.calls.map((call) => String(call[0]));

describe('telemetry command (CLI)', () => {
    beforeAll(() => {
        // Never touch the real settings of the developer if the home directory could not be redirected
        if (!getFioriToolsDirectory().startsWith(homeDirectory)) {
            throw new Error(`Unexpected Fiori tools directory ${getFioriToolsDirectory()}`);
        }
        // The store creates a missing directory when writing, which does not work in the Jest sandbox
        mkdirSync(getFioriToolsDirectory(), { recursive: true });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.DO_NOT_TRACK;
        delete process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY;
    });

    afterAll(() => {
        process.env = { ...originalEnv };
        rmSync(homeDirectory, { recursive: true, force: true });
    });

    test('status reports telemetry as enabled until a setting is saved', async () => {
        await run('telemetry', 'status');

        expect(getInfoMessages()).toEqual(['Telemetry is enabled.']);
    });

    test('disable persists the setting that status and the shared store report', async () => {
        await run('telemetry', 'disable');

        expect(getInfoMessages()).toEqual(['Telemetry is disabled.']);
        expect(existsSync(settingsFile)).toBe(true);
        expect(readEnableTelemetry()).toBe(false);

        jest.clearAllMocks();
        await run('telemetry', 'status');
        expect(getInfoMessages()).toEqual(['Telemetry is disabled.']);
    });

    test('enable persists the setting again', async () => {
        await run('telemetry', 'enable');

        expect(getInfoMessages()).toEqual(['Telemetry is enabled.']);
        expect(readEnableTelemetry()).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('status reports an opt-out by the DO_NOT_TRACK environment variable', async () => {
        process.env.DO_NOT_TRACK = '1';

        await run('telemetry', 'status');

        expect(getInfoMessages()).toEqual(['Telemetry is disabled by the environment variable DO_NOT_TRACK.']);
    });

    test('lists the telemetry command in the help', async () => {
        const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const exit = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('exit');
        }) as never);
        try {
            await run('telemetry', '--help');

            expect(write.mock.calls.map((call) => String(call[0])).join('')).toMatch(
                /enable[\s\S]*disable[\s\S]*status/
            );
        } finally {
            write.mockRestore();
            exit.mockRestore();
        }
    });
});
