import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';

const mockGetHostEnvironment = jest.fn();

const realFioriGenShared = await import('@sap-ux/fiori-generator-shared');
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...realFioriGenShared,
    getHostEnvironment: mockGetHostEnvironment
}));

const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');
const { initI18n } = await import('../../../src/utils/i18n');
const { initCache, cachePut, cacheGet, cacheClear } = await import('../../../src/utils/appWizardCache');
type AppWizardWithCache = import('../../../src/utils/appWizardCache').AppWizardWithCache;
type ConfigPrompter = import('../../../src/app/questions/configuration').ConfigPrompter;

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
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        cacheGet(undefined, 'prompter', logger);
        expect(logger.info).toHaveBeenCalledWith('Warning: caching is not supported');
    });
});
