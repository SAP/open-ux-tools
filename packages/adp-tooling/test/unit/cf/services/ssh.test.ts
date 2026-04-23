import fs from 'node:fs';
import path from 'node:path';
import * as CFToolsCli from '@sap/cf-tools/out/src/cli';

import type { ToolsLogger } from '@sap-ux/logger';

import { ensureTunnelAppExists, enableSshAndRestart } from '../../../../src/cf/services/ssh';

const mockTmpDir = path.join('/tmp', 'adp-tunnel-mock');

jest.mock('@sap/cf-tools/out/src/cli', () => ({
    Cli: {
        execute: jest.fn()
    }
}));

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    mkdtempSync: jest.fn(),
    writeFileSync: jest.fn(),
    rmSync: jest.fn()
}));

const mockRmSync = fs.rmSync as jest.Mock;
const mockMkdtempSync = fs.mkdtempSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockCFToolsCliExecute = CFToolsCli.Cli.execute as jest.MockedFunction<typeof CFToolsCli.Cli.execute>;

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
            mockCFToolsCliExecute.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await ensureTunnelAppExists('my-tunnel', mockLogger);

            expect(mockCFToolsCliExecute).toHaveBeenCalledTimes(1);
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['app', 'my-tunnel'],
                expect.objectContaining({ env: { CF_COLOR: 'false' } })
            );
            expect(mockMkdtempSync).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Tunnel app "my-tunnel" already exists.');
        });

        test('should deploy minimal app when not found', async () => {
            mockCFToolsCliExecute
                .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'not found' })
                .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });

            await ensureTunnelAppExists('my-tunnel', mockLogger);

            expect(mockCFToolsCliExecute).toHaveBeenCalledTimes(2);
            expect(mockMkdtempSync).toHaveBeenCalled();
            expect(mockWriteFileSync).toHaveBeenCalledWith(path.join(mockTmpDir, '.keep'), '');
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                [
                    'push',
                    'my-tunnel',
                    '-p',
                    mockTmpDir,
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
                ],
                expect.objectContaining({ env: { CF_COLOR: 'false' } })
            );
            expect(mockLogger.info).toHaveBeenCalledWith('Tunnel app "my-tunnel" deployed successfully.');
        });

        test('should clean up temp directory even when push fails', async () => {
            mockCFToolsCliExecute
                .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'not found' })
                .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'push failed' });

            await expect(ensureTunnelAppExists('my-tunnel', mockLogger)).rejects.toThrow();

            expect(mockRmSync).toHaveBeenCalledWith(mockTmpDir, {
                recursive: true,
                force: true
            });
        });
    });

    describe('enableSshAndRestart', () => {
        test('should enable SSH and restart the app', async () => {
            mockCFToolsCliExecute.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

            await enableSshAndRestart('my-tunnel', mockLogger);

            expect(mockCFToolsCliExecute).toHaveBeenCalledTimes(2);
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['enable-ssh', 'my-tunnel'],
                expect.objectContaining({ env: { CF_COLOR: 'false' } })
            );
            expect(mockCFToolsCliExecute).toHaveBeenCalledWith(
                ['restart', 'my-tunnel', '--strategy', 'rolling', '--no-wait'],
                expect.objectContaining({ env: { CF_COLOR: 'false' } })
            );
        });

        test('should throw when enable-ssh fails', async () => {
            mockCFToolsCliExecute.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'ssh failed' });

            await expect(enableSshAndRestart('my-tunnel', mockLogger)).rejects.toThrow();
        });

        test('should throw when restart fails', async () => {
            mockCFToolsCliExecute
                .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
                .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'restart failed' });

            await expect(enableSshAndRestart('my-tunnel', mockLogger)).rejects.toThrow();
        });
    });
});
