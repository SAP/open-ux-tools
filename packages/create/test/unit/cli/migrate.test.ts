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

const mockGetProjectType = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    getProjectType: (...args: any[]) => mockGetProjectType(...args)
}));

const mockMigrate = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/fiori-migration-writer', () => ({
    ProjectMigrator: {
        migrate: (...args: any[]) => mockMigrate(...args)
    }
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
        mockGetProjectType.mockResolvedValue(undefined);
        mockMigrate.mockResolvedValue({ result: true, messages: [] });
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
            'https://ui5.sap.com/1.120.0'
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('successfully'));
    });

    test('should migrate with hostname', async () => {
        mockPrompt
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com'])
        );

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '');
    });

    test('should handle migration failure', async () => {
        mockMigrate.mockResolvedValue({
            result: false,
            messages: [{ type: 'ERROR', description: 'Failed' }]
        });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await expect(
            command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--client', '100']))
        ).rejects.toThrow('process.exit called');

        expect(loggerMock.error).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should handle migration error exception', async () => {
        mockMigrate.mockRejectedValue(new Error('Unexpected error'));

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await expect(
            command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--client', '100']))
        ).rejects.toThrow('process.exit called');

        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('Migration failed with error'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should log migration messages by type', async () => {
        mockMigrate.mockResolvedValue({
            result: true,
            messages: [
                { type: 'SUCCESS', description: 'Migration successful' },
                { type: 'WARNING', description: 'Some files skipped' },
                { type: 'ERROR', description: 'Non-critical error' }
            ]
        });

        mockPrompt
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--destination', 'myDest'])
        );

        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('SUCCESS'));
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    });

    test('should cancel migration when project already migrated and user declines force', async () => {
        mockGetProjectType.mockResolvedValue('edmx');
        mockPrompt.mockResolvedValueOnce({ confirmForce: false });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--client', '100'])
        );

        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('already migrated'));
        expect(loggerMock.info).toHaveBeenCalledWith('Migration cancelled.');
        expect(mockMigrate).not.toHaveBeenCalled();
    });

    test('should force migrate when flag provided', async () => {
        mockGetProjectType.mockResolvedValue('edmx');

        mockPrompt
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--force'])
        );

        expect(mockMigrate).toHaveBeenCalled();
    });

    test('should use sap-system-name as destination alias', async () => {
        mockPrompt
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--sap-system-name', 'mySystem'])
        );

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/mySystem', '');
    });

    test('should prompt for project path when not provided', async () => {
        mockPrompt
            .mockResolvedValueOnce({ confirmPath: true })
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' })
            .mockResolvedValueOnce({ useDestination: true })
            .mockResolvedValueOnce({ dest: 'myDest' });

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
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' })
            .mockResolvedValueOnce({ useDestination: true })
            .mockResolvedValueOnce({ dest: 'myDest' });

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
        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/promptDest', '');
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

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '');
    });

    test('should prompt for UI5 version when not provided', async () => {
        mockPrompt
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '1.108.0' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), '/myDest', 'https://ui5.sap.com/1.108.0');
    });

    test('should prompt for client when not provided', async () => {
        mockPrompt
            .mockResolvedValueOnce({ clientValue: '200' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--destination', 'myDest']));

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'clientValue' }));
    });
});
