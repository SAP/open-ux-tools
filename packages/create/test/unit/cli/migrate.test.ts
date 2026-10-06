import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: jest.fn()
}));

const mockRunNpmInstallCommand = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../src/common/index.js', () => ({
    runNpmInstallCommand: (...args: unknown[]) => mockRunNpmInstallCommand(...args)
}));

const mockMigrate = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/fiori-migration-writer', () => ({
    ProjectAccess: {
        getClientFromDestinationName: (destination: string) => (destination.endsWith('001') ? '001' : '')
    },
    ProjectMigrator: {
        migrate: (...args: any[]) => mockMigrate(...args)
    },
    initI18n: jest.fn().mockResolvedValue(undefined)
}));

const mockPrompt = jest.fn() as jest.Mock;
jest.unstable_mockModule('prompts', () => ({
    default: mockPrompt
}));

const { addMigrateCommand } = await import('../../../src/cli/migrate/index.js');

describe('migrate command', () => {
    const testProjectRoot = join(__dirname, '../../fixtures/bare-minimum');

    let loggerMock: ToolsLogger;
    let mockExit: jest.SpiedFunction<any>;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockMigrate.mockResolvedValue({
            result: true,
            messages: [],
            fs: {
                commit: jest.fn((callback: (err?: Error) => void) => callback())
            }
        });
        mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as any);
    });

    afterEach(() => {
        mockExit.mockRestore();
    });

    test('should migrate project with all CLI options', async () => {
        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv([
                'migrate',
                testProjectRoot,
                '--destination',
                'myDest',
                '--client',
                '100',
                '--ui5-version',
                '1.120.0'
            ])
        );

        expect(mockMigrate).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            '/myDest',
            'https://ui5.sap.com/1.120.0',
            expect.objectContaining({
                sapClient: '100',
                destination: 'myDest'
            })
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('successfully'));
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(expect.stringContaining('bare-minimum'), [], {
            logger: loggerMock
        });
    });

    test('should migrate with hostname', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            hostname: 'myhost.com'
        });
    });

    test('should handle migration failure', async () => {
        mockMigrate.mockResolvedValue({
            result: false,
            messages: [{ type: 'ERROR', description: 'Failed' }],
            fs: {
                commit: jest.fn((callback: (err?: Error) => void) => callback())
            }
        });

        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await expect(
            command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--client', '100']))
        ).rejects.toThrow('Migration failed');

        expect(loggerMock.error).toHaveBeenCalled();
    });

    test('should handle migration error exception', async () => {
        mockMigrate.mockRejectedValue(new Error('Unexpected error'));

        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await expect(
            command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--client', '100']))
        ).rejects.toThrow('Unexpected error');
    });

    test('should log migration messages by type', async () => {
        mockMigrate.mockResolvedValue({
            result: true,
            messages: [
                { type: 'SUCCESS', description: 'Migration successful' },
                { type: 'WARNING', description: 'Some files skipped' },
                { type: 'ERROR', description: 'Non-critical error' }
            ],
            fs: {
                commit: jest.fn((callback: (err?: Error) => void) => callback())
            }
        });

        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest']));

        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('SUCCESS'));
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    });

    test('should cancel migration when project already migrated and user declines force', async () => {
        const migratedProjectRoot = join(__dirname, '../../fixtures/migrated-project');
        mockPrompt.mockResolvedValueOnce({ confirmForce: false });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', migratedProjectRoot, '--destination', 'myDest', '--client', '100'])
        );

        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('already migrated'));
        expect(loggerMock.info).toHaveBeenCalledWith('Migration cancelled.');
        expect(mockMigrate).not.toHaveBeenCalled();
    });

    test('should force migrate when flag provided', async () => {
        const migratedProjectRoot = join(__dirname, '../../fixtures/migrated-project');

        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', migratedProjectRoot, '--destination', 'myDest', '--force']));

        expect(mockMigrate).toHaveBeenCalled();
    });

    test('should skip dependency installation when requested', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--skip-install']));

        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('npm install'));
    });

    test('should use sap-system-name as destination alias', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--sap-system-name', 'mySystem']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/mySystem', '', { destination: 'mySystem' });
    });

    test('should derive the SAP client from a destination suffix', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'ER9CLNT001']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/ER9CLNT001', '', {
            destination: 'ER9CLNT001',
            sapClient: '001'
        });
    });

    test('should prompt for project path when not provided', async () => {
        mockPrompt
            .mockResolvedValueOnce({ confirmPath: true })
            .mockResolvedValueOnce({ useDestination: true })
            .mockResolvedValueOnce({ dest: 'myDest' })
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate']));

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'confirmPath' }));
        expect(mockMigrate).toHaveBeenCalled();
    });

    test('should prompt for custom path when default declined', async () => {
        mockPrompt
            .mockResolvedValueOnce({ confirmPath: false })
            .mockResolvedValueOnce({ customPath: testProjectRoot })
            .mockResolvedValueOnce({ useDestination: true })
            .mockResolvedValueOnce({ dest: 'myDest' })
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate']));

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'customPath' }));
        expect(mockMigrate).toHaveBeenCalled();
    });

    test('should prompt for destination when not provided', async () => {
        mockPrompt
            .mockResolvedValueOnce({ useDestination: true })
            .mockResolvedValueOnce({ dest: 'promptDest' })
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'useDestination' }));
        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/promptDest', '', { destination: 'promptDest' });
    });

    test('should prompt for hostname when destination declined', async () => {
        mockPrompt
            .mockResolvedValueOnce({ useDestination: false })
            .mockResolvedValueOnce({ host: 'myhost.com' })
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            hostname: 'myhost.com'
        });
    });

    test('should prompt for UI5 version when not provided', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '' }).mockResolvedValueOnce({ version: '1.108.0' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/myDest', 'https://ui5.sap.com/1.108.0', {
            destination: 'myDest'
        });
    });

    test('should prompt for client when not provided', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '200' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest']));

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'clientValue' }));
        expect(mockMigrate).toHaveBeenCalledWith(
            expect.any(String),
            '/myDest',
            '',
            expect.objectContaining({ sapClient: '200' })
        );
    });
});
