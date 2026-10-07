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

// Mock i18n to return keys as-is for testing
jest.unstable_mockModule('../../../src/i18n.js', () => ({
    initI18n: jest.fn(),
    t: (key: string, params?: Record<string, string>) => {
        // Return a simplified version for testing
        const translations: Record<string, string> = {
            'migrate.status.success': '✓ Migration completed successfully!',
            'migrate.status.messages': '\nMessages:',
            'migrate.status.skipInstallWarning':
                '`npm install` was skipped. Install project dependencies before running the application.',
            'migrate.status.installing': 'Installing project dependencies...',
            'migrate.status.installFailed':
                'Migration completed, but dependency installation failed. Resolve the npm error above before running the project.',
            'migrate.status.failed': '✗ Migration failed',
            'migrate.status.failedError': 'Migration failed',
            'migrate.prompts.alreadyMigrated': 'Project appears to be already migrated to Fiori tools.',
            'migrate.prompts.cancelled': 'Migration cancelled.'
        };
        return translations[key] || key;
    }
}));

const mockIsAppStudio = jest.fn() as jest.Mock;
const mockListDestinations = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    DestinationProxyType: { ON_PREMISE: 'OnPremise' },
    isAppStudio: () => mockIsAppStudio(),
    listDestinations: () => mockListDestinations()
}));

const mockIsInternalFeaturesSettingEnabled = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: () => mockIsInternalFeaturesSettingEnabled()
}));

const mockGetService = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: (...args: unknown[]) => mockGetService(...args)
}));

const mockFindSystemByUrl = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../src/cli/utils/system-lookup.js', () => ({
    findSystemByUrl: (...args: unknown[]) => mockFindSystemByUrl(...args)
}));

const mockGetProjectInfo = jest.fn() as jest.Mock;
const mockRunNpmInstallCommand = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../src/common/index.js', () => ({
    runNpmInstallCommand: (...args: unknown[]) => mockRunNpmInstallCommand(...args)
}));

const mockMigrate = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/fiori-migration-writer', () => ({
    ProjectAccess: {
        getProjectInfo: (...args: unknown[]) => mockGetProjectInfo(...args),
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
        mockPrompt.mockReset();

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockIsAppStudio.mockReturnValue(false);
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(false);
        mockListDestinations.mockResolvedValue({});
        mockFindSystemByUrl.mockResolvedValue(undefined);
        mockGetProjectInfo.mockResolvedValue({ projectInfo: { hostname: '', sapClient: '' }, messages: [] });
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
                '--hostname',
                'myhost.com',
                '--client',
                '100',
                '--ui5-version',
                '1.120.0'
            ])
        );

        expect(mockMigrate).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            'https://myhost.com',
            'https://ui5.sap.com/1.120.0',
            expect.objectContaining({
                sapClient: '100',
                destination: 'myDest',
                hostname: 'myhost.com'
            })
        );
        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('successfully'));
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(expect.stringContaining('bare-minimum'), [], {
            logger: loggerMock
        });
    });

    test('should migrate with hostname', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '100' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            hostname: 'myhost.com',
            sapClient: '100'
        });
    });

    test('should accept a hostname with protocol and port', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '100' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'https://myhost.com:443']));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com:443', '', {
            hostname: 'myhost.com:443',
            sapClient: '100'
        });
    });

    test('should pass internal enablement to the migration writer', async () => {
        mockIsInternalFeaturesSettingEnabled.mockReturnValue(true);
        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com', '--client', '100']));

        expect(mockMigrate).toHaveBeenCalledWith(
            expect.any(String),
            'https://myhost.com',
            '',
            expect.objectContaining({ hostname: 'myhost.com', sapClient: '100' }),
            undefined,
            true
        );
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
            command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com', '--client', '100']))
        ).rejects.toThrow('Migration failed');

        expect(loggerMock.error).toHaveBeenCalled();
    });

    test('should handle migration error exception', async () => {
        mockMigrate.mockRejectedValue(new Error('Unexpected error'));

        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await expect(
            command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com', '--client', '100']))
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

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        mockPrompt.mockResolvedValueOnce({ version: '' });
        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com', '--client', '100']));

        expect(loggerMock.info).toHaveBeenCalledWith(expect.stringContaining('SUCCESS'));
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    });

    test('should cancel migration when project already migrated and user declines force', async () => {
        const migratedProjectRoot = join(__dirname, '../../fixtures/migrated-project');
        mockPrompt.mockResolvedValueOnce({ confirmForce: false });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        mockPrompt.mockResolvedValueOnce({ version: '' });
        await command.parseAsync(
            getArgv(['migrate', migratedProjectRoot, '--destination', 'myDest', '--client', '100'])
        );

        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('already migrated'));
        expect(loggerMock.info).toHaveBeenCalledWith('Migration cancelled.');
        expect(mockMigrate).not.toHaveBeenCalled();
    });

    test('should force migrate when flag provided', async () => {
        const migratedProjectRoot = join(__dirname, '../../fixtures/migrated-project');

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        mockPrompt.mockResolvedValueOnce({ version: '' });
        await command.parseAsync(
            getArgv(['migrate', migratedProjectRoot, '--hostname', 'myhost.com', '--client', '100', '--force'])
        );

        expect(mockMigrate).toHaveBeenCalled();
    });

    test('should skip dependency installation when requested', async () => {
        const command = new Command('sap-ux');
        addMigrateCommand(command);

        mockPrompt.mockResolvedValueOnce({ version: '' });
        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com', '--client', '100', '--skip-install'])
        );

        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('npm install'));
    });

    test('should report dependency installation failures after migration', async () => {
        mockRunNpmInstallCommand.mockResolvedValueOnce(new Error('Dependency conflict'));
        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot, '--hostname', 'myhost.com', '--client', '100']));

        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('dependency installation failed'));
    });

    test('should use sap-system-name as destination alias', async () => {
        const command = new Command('sap-ux');
        addMigrateCommand(command);

        mockPrompt.mockResolvedValueOnce({ version: '' });
        await command.parseAsync(
            getArgv([
                'migrate',
                testProjectRoot,
                '--sap-system-name',
                'mySystem',
                '--hostname',
                'myhost.com',
                '--client',
                '100'
            ])
        );

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            destination: 'mySystem',
            hostname: 'myhost.com',
            sapClient: '100'
        });
    });

    test('should derive the SAP client from a destination suffix', async () => {
        const command = new Command('sap-ux');
        addMigrateCommand(command);

        mockPrompt.mockResolvedValueOnce({ version: '' });
        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--destination', 'ER9CLNT001', '--hostname', 'myhost.com'])
        );

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            destination: 'ER9CLNT001',
            hostname: 'myhost.com',
            sapClient: '001'
        });
    });

    test('should use a matched saved system outside BAS', async () => {
        const savedSystem = {
            name: 'ER9CLNT001',
            url: 'https://backend.example.com',
            client: '001'
        };
        mockGetProjectInfo.mockResolvedValueOnce({
            projectInfo: { hostname: savedSystem.url, sapClient: savedSystem.client },
            messages: []
        });
        mockGetService.mockResolvedValue({});
        mockFindSystemByUrl.mockResolvedValue(savedSystem);
        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockFindSystemByUrl).toHaveBeenCalledWith(savedSystem.url, savedSystem.client, {});
        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), savedSystem.url, '', {
            destination: savedSystem.name,
            hostname: 'backend.example.com',
            sapClient: savedSystem.client,
            scp: false
        });
    });

    test('should not query saved systems in BAS', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockGetProjectInfo.mockResolvedValueOnce({
            projectInfo: { hostname: 'https://backend.example.com', sapClient: '001' },
            messages: []
        });
        mockPrompt
            .mockResolvedValueOnce({ dest: 'ER9CLNT001' })
            .mockResolvedValueOnce({ clientValue: '' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockGetService).not.toHaveBeenCalled();
        expect(mockFindSystemByUrl).not.toHaveBeenCalled();
    });

    test('should use a matching BAS destination', async () => {
        const destination = {
            Name: 'DEMOCLNT001',
            Host: 'https://demo.example.test',
            ProxyType: 'OnPremise',
            'sap-client': '001'
        };
        mockIsAppStudio.mockReturnValue(true);
        mockGetProjectInfo.mockResolvedValueOnce({
            projectInfo: { destination: destination.Name, hostname: destination.Host, sapClient: '' },
            messages: []
        });
        mockListDestinations.mockResolvedValue({ [destination.Name]: destination });
        mockPrompt.mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockGetService).not.toHaveBeenCalled();
        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), destination.Host, '', {
            destination: destination.Name,
            hostname: 'demo.example.test',
            sapClient: destination['sap-client'],
            scp: true
        });
    });

    test('should prompt for project path when not provided', async () => {
        mockPrompt
            .mockResolvedValueOnce({ confirmPath: true })
            .mockResolvedValueOnce({ useDestination: true })
            .mockResolvedValueOnce({ dest: 'myDest' })
            .mockResolvedValueOnce({ host: 'myhost.com' })
            .mockResolvedValueOnce({ clientValue: '100' })
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
            .mockResolvedValueOnce({ host: 'myhost.com' })
            .mockResolvedValueOnce({ clientValue: '100' })
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
            .mockResolvedValueOnce({ host: 'myhost.com' })
            .mockResolvedValueOnce({ clientValue: '100' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'useDestination' }));
        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            destination: 'promptDest',
            hostname: 'myhost.com',
            sapClient: '100'
        });
    });

    test('should prompt for hostname when destination declined', async () => {
        mockPrompt
            .mockResolvedValueOnce({ useDestination: false })
            .mockResolvedValueOnce({ host: 'myhost.com' })
            .mockResolvedValueOnce({ clientValue: '100' })
            .mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(getArgv(['migrate', testProjectRoot]));

        expect(mockMigrate).toHaveBeenCalledWith(expect.any(String), 'https://myhost.com', '', {
            hostname: 'myhost.com',
            sapClient: '100'
        });
    });

    test('should prompt for UI5 version when not provided', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '100' }).mockResolvedValueOnce({ version: '1.108.0' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--hostname', 'myhost.com'])
        );

        expect(mockMigrate).toHaveBeenCalledWith(
            expect.any(String),
            'https://myhost.com',
            'https://ui5.sap.com/1.108.0',
            {
                destination: 'myDest',
                hostname: 'myhost.com',
                sapClient: '100'
            }
        );
    });

    test('should prompt for client when not provided', async () => {
        mockPrompt.mockResolvedValueOnce({ clientValue: '200' }).mockResolvedValueOnce({ version: '' });

        const command = new Command('sap-ux');
        addMigrateCommand(command);

        await command.parseAsync(
            getArgv(['migrate', testProjectRoot, '--destination', 'myDest', '--hostname', 'myhost.com'])
        );

        expect(mockPrompt).toHaveBeenCalledWith(expect.objectContaining({ name: 'clientValue' }));
        expect(mockMigrate).toHaveBeenCalledWith(
            expect.any(String),
            'https://myhost.com',
            '',
            expect.objectContaining({ hostname: 'myhost.com', sapClient: '200' })
        );
    });
});
