import { jest } from '@jest/globals';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

const mockTmpDir = path.join('/tmp', 'adp-tunnel-mock');

const mockMkdtempSync = jest.fn<() => string>().mockReturnValue(mockTmpDir);
const mockWriteFileSync = jest.fn();
const mockRmSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    default: {
        mkdtempSync: mockMkdtempSync,
        writeFileSync: mockWriteFileSync,
        rmSync: mockRmSync
    },
    mkdtempSync: mockMkdtempSync,
    writeFileSync: mockWriteFileSync,
    rmSync: mockRmSync
}));

const mockCheckAppExists = jest.fn<(appName: string) => Promise<boolean>>();
const mockPushApp = jest.fn<(appName: string, appPath: string, args?: string[]) => Promise<void>>();
const mockEnableSsh = jest.fn<(appName: string) => Promise<void>>();
const mockRestartApp = jest.fn<(appName: string) => Promise<void>>();

jest.unstable_mockModule('../../../../src/cf/services/cli', () => ({
    checkAppExists: mockCheckAppExists,
    pushApp: mockPushApp,
    enableSsh: mockEnableSsh,
    restartApp: mockRestartApp
}));

const { ensureTunnelAppExists, enableSshAndRestart } = await import('../../../../src/cf/services/ssh');

describe('SSH Services', () => {
    const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockMkdtempSync.mockReturnValue(mockTmpDir);
    });

    describe('ensureTunnelAppExists', () => {
        test('should skip deploy when app already exists', async () => {
            mockCheckAppExists.mockResolvedValue(true);

            await ensureTunnelAppExists('my-tunnel', mockLogger);

            expect(mockCheckAppExists).toHaveBeenCalledWith('my-tunnel');
            expect(mockMkdtempSync).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Tunnel app "my-tunnel" already exists.');
        });

        test('should deploy minimal app when not found', async () => {
            mockCheckAppExists.mockResolvedValue(false);
            mockPushApp.mockResolvedValue(undefined);

            await ensureTunnelAppExists('my-tunnel', mockLogger);

            expect(mockMkdtempSync).toHaveBeenCalled();
            expect(mockWriteFileSync).toHaveBeenCalledWith(path.join(mockTmpDir, '.keep'), '');
            expect(mockPushApp).toHaveBeenCalledWith('my-tunnel', mockTmpDir, [
                '--no-route',
                '-m',
                '64M',
                '-k',
                '256M',
                '-b',
                'binary_buildpack',
                '-c',
                'sleep infinity',
                '--health-check-type',
                'process'
            ]);
            expect(mockLogger.info).toHaveBeenCalledWith('Tunnel app "my-tunnel" deployed successfully.');
        });

        test('should clean up temp directory even when push fails', async () => {
            mockCheckAppExists.mockResolvedValue(false);
            mockPushApp.mockRejectedValue(new Error('push failed'));

            await expect(ensureTunnelAppExists('my-tunnel', mockLogger)).rejects.toThrow();

            expect(mockRmSync).toHaveBeenCalledWith(mockTmpDir, {
                recursive: true,
                force: true
            });
        });
    });

    describe('enableSshAndRestart', () => {
        test('should enable SSH and restart the app', async () => {
            mockEnableSsh.mockResolvedValue(undefined);
            mockRestartApp.mockResolvedValue(undefined);

            await enableSshAndRestart('my-tunnel', mockLogger);

            expect(mockEnableSsh).toHaveBeenCalledWith('my-tunnel');
            expect(mockRestartApp).toHaveBeenCalledWith('my-tunnel');
        });

        test('should throw when enable-ssh fails', async () => {
            mockEnableSsh.mockRejectedValue(new Error('ssh failed'));

            await expect(enableSshAndRestart('my-tunnel', mockLogger)).rejects.toThrow();
        });

        test('should throw when restart fails', async () => {
            mockEnableSsh.mockResolvedValue(undefined);
            mockRestartApp.mockRejectedValue(new Error('restart failed'));

            await expect(enableSshAndRestart('my-tunnel', mockLogger)).rejects.toThrow();
        });
    });
});
