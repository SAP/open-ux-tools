import { runPostAppGenHook, type RepoAppGenContext } from '../../src/utils/event-hook';
import type { VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import { t } from '../../src/utils/i18n';
import RepoAppDownloadLogger from '../../src/utils/logger';

jest.mock('../../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

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
        expect(mockContext.vscodeInstance).toBeUndefined();
    });

    it('should log an error if postGenCommand is missing', async () => {
        mockContext.postGenCommand = '';
        await runPostAppGenHook(mockContext);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.eventHookErrors.postGenCommandMissing')
        );
        expect(mockContext.vscodeInstance?.commands?.executeCommand).not.toHaveBeenCalled();
    });

    it('should execute the post-generation command successfully', async () => {
        await runPostAppGenHook(mockContext);
        expect(mockContext.vscodeInstance?.commands?.executeCommand).toHaveBeenCalledWith('mockCommand', {
            fsPath: '/mock/path',
            deployConfig: undefined
        });
    });

    it('should pass deployConfig when provided', async () => {
        const deployConfig = { target: { url: 'http://example.com' }, app: { name: 'myapp', package: 'MYPKG' } };
        mockContext.deployConfig = deployConfig as any;
        await runPostAppGenHook(mockContext);
        expect(mockContext.vscodeInstance?.commands?.executeCommand).toHaveBeenCalledWith('mockCommand', {
            fsPath: '/mock/path',
            deployConfig
        });
    });

    it('should log an error if executeCommand throws', async () => {
        const mockError = new Error('Command execution failed');
        if (mockContext.vscodeInstance) {
            mockContext.vscodeInstance.commands.executeCommand = jest.fn().mockRejectedValue(mockError);
        }
        await runPostAppGenHook(mockContext);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledTimes(1);
    });
});
