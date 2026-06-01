import { jest } from '@jest/globals';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import { t } from '../../src/utils/i18n';

const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

jest.unstable_mockModule('../../src/utils/logger', () => {
    const mock = { logger: mockLogger, configureLogging: jest.fn() };
    return { default: mock, ...mock };
});

const { runPostAppGenHook } = await import('../../src/utils/event-hook');
const RepoAppDownloadLogger = (await import('../../src/utils/logger')).default;
import type { RepoAppGenContext } from '../../src/utils/event-hook.js';

describe('runPostAppGenHook', () => {
    let mockContext: RepoAppGenContext;

    beforeEach(() => {
        mockContext = {
            vscodeInstance: {
                commands: {
                    executeCommand: jest.fn()
                }
            } as unknown as VSCodeInstance,
            postGenCommand: 'mockCommand',
            path: '/mock/path'
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should log an error if vscodeInstance is missing', async () => {
        mockContext.vscodeInstance = undefined;
        await runPostAppGenHook(mockContext);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.eventHookErrors.vscodeInstanceMissing')
        );
    });

    it('should log an error if postGenCommand is missing', async () => {
        mockContext.postGenCommand = '';
        await runPostAppGenHook(mockContext);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.eventHookErrors.postGenCommandMissing')
        );
    });

    it('should execute the post-generation command successfully', async () => {
        await runPostAppGenHook(mockContext);
        expect(mockContext.vscodeInstance?.commands?.executeCommand).toHaveBeenCalledWith('mockCommand', {
            fsPath: '/mock/path'
        });
    });

    it('should log an error if executeCommand throws an error', async () => {
        const mockError = new Error('Command execution failed');
        if (mockContext.vscodeInstance) {
            mockContext.vscodeInstance.commands.executeCommand = jest.fn().mockRejectedValue(mockError) as any;
        }
        await runPostAppGenHook(mockContext);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.eventHookErrors.commandExecutionFailed')
        );
    });
});
