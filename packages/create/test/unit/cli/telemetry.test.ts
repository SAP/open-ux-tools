import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';

const mockLogger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.unstable_mockModule('../../../src/tracing/index.js', () => ({
    getLogger: () => mockLogger
}));

jest.unstable_mockModule('../../../src/i18n.js', () => ({
    t: (key: string) => key
}));

const mockSetEnableTelemetry = jest.fn() as jest.Mock<(enable: boolean) => Promise<void>>;
const mockGetTelemetrySetting = jest.fn() as jest.Mock<() => Promise<{ enableTelemetry: boolean } | undefined>>;
jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    setEnableTelemetry: (enable: boolean) => mockSetEnableTelemetry(enable),
    getTelemetrySetting: () => mockGetTelemetrySetting()
}));

const { getTelemetryCommand } = await import('../../../src/cli/telemetry/index.js');

describe('telemetry command', () => {
    const run = async (subCommand: string): Promise<void> => {
        const program = new Command('sap-ux');
        program.addCommand(getTelemetryCommand());
        await program.parseAsync(['', '', 'telemetry', subCommand]);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.exitCode = undefined;
    });

    afterEach(() => {
        process.exitCode = undefined;
    });

    test('registers enable, disable and status subcommands', () => {
        const command = getTelemetryCommand();
        expect(command.name()).toBe('telemetry');
        expect(command.commands.map((c) => c.name())).toEqual(['enable', 'disable', 'status']);
    });

    test.each([
        ['enable', true, 'telemetry.status.enabled'],
        ['disable', false, 'telemetry.status.disabled']
    ])('%s persists the setting', async (subCommand, enable, message) => {
        mockGetTelemetrySetting.mockResolvedValue({ enableTelemetry: enable });

        await run(subCommand);

        expect(mockSetEnableTelemetry).toHaveBeenCalledWith(enable);
        expect(mockLogger.info).toHaveBeenCalledWith(message);
        expect(process.exitCode).toBeUndefined();
    });

    test('reports an error when the setting could not be saved', async () => {
        mockGetTelemetrySetting.mockResolvedValue(undefined);

        await run('disable');

        expect(mockSetEnableTelemetry).toHaveBeenCalledWith(false);
        expect(mockLogger.error).toHaveBeenCalledWith('telemetry.status.updateFailed');
        expect(process.exitCode).toBe(1);
    });

    test.each([
        [{ enableTelemetry: true }, 'telemetry.status.enabled'],
        [{ enableTelemetry: false }, 'telemetry.status.disabled'],
        [undefined, 'telemetry.status.enabledByDefault']
    ])('status prints the current setting %j', async (setting, message) => {
        mockGetTelemetrySetting.mockResolvedValue(setting);

        await run('status');

        expect(mockLogger.info).toHaveBeenCalledWith(message);
        expect(mockSetEnableTelemetry).not.toHaveBeenCalled();
    });
});
