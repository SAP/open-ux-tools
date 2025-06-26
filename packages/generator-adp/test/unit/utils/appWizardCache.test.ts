import type { ToolsLogger } from '@sap-ux/logger';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

import { initI18n } from '../../../src/utils/i18n';
import type { ConfigPrompter } from '../../../src/app/questions/configuration';
import { initCache, cachePut, cacheGet, cacheClear, type AppWizardWithCache } from '../../../src/utils/appWizardCache';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    getHostEnvironment: jest.fn()
}));

const getHostEnvironmentMock = getHostEnvironment as jest.Mock;

describe('appWizardCache', () => {
    let logger: ToolsLogger;
    let mockWizard: AppWizardWithCache;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        logger = {
            debug: jest.fn(),
            info: jest.fn()
        } as unknown as ToolsLogger;
        mockWizard = {} as AppWizardWithCache;
    });

    it('should initialize cache on AppWizard', () => {
        initCache(logger, mockWizard);
        expect(mockWizard['$adp-generator-cache']).toEqual({});
        expect(logger.debug).toHaveBeenCalledWith('ADP-wizard cache initialised.');
    });

    it('should store state in cache using cachePut()', () => {
        initCache(logger, mockWizard);
        cachePut(mockWizard, { prompter: 'mocked' as unknown as ConfigPrompter }, logger);
        expect(mockWizard['$adp-generator-cache']?.prompter).toBe('mocked');
    });

    it('should retrieve state from cache using cacheGet()', () => {
        initCache(logger, mockWizard);
        mockWizard['$adp-generator-cache']!.prompter = 'mocked-value' as unknown as ConfigPrompter;
        const value = cacheGet<string>(mockWizard, 'prompter', logger);
        expect(value).toBe('mocked-value');
    });

    it('should return undefined if key not found in cache', () => {
        initCache(logger, mockWizard);
        const value = cacheGet<string>(mockWizard, 'nonexistentKey' as any, logger);
        expect(value).toBeUndefined();
    });

    it('should clear cache using cacheClear()', () => {
        initCache(logger, mockWizard);
        mockWizard['$adp-generator-cache']!.prompter = 'exists' as unknown as ConfigPrompter;
        cacheClear(mockWizard, logger);
        expect(mockWizard['$adp-generator-cache']).toBeUndefined();
    });

    it('should log warning if cache not initialized and running in vscode', () => {
        getHostEnvironmentMock.mockReturnValue(hostEnvironment.vscode);

        cacheGet(undefined, 'prompter', logger);
        expect(logger.info).toHaveBeenCalledWith('Warning: caching is not supported');
    });
});
