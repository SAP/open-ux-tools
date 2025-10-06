import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import {
    initAppWizardCache,
    addToCache,
    getFromCache,
    deleteCache,
    type AppWizardCache
} from '../../src/utils/appWizardCache';

const ADP_FLP_CONFIG_CACHE = '$adp-flp-config-cache';

// Removes the jest warning about an open handle (PIPEWRAP), which happens because
// stdin keeps the stream open during tests.
jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

describe('appWizardCache', () => {
    let logger: any;

    beforeEach(() => {
        logger = {
            debug: jest.fn(),
            info: jest.fn()
        };
    });

    describe('initAppWizardCache', () => {
        it('should initialize the cache if not present', () => {
            const appWizard: any = {};

            initAppWizardCache(logger, appWizard);

            expect(appWizard[ADP_FLP_CONFIG_CACHE]).toEqual({ credentialsPrompted: false });
            expect(logger.debug).toHaveBeenCalledWith('AppWizard based cache initialized.');
        });

        it('should not overwrite existing cache', () => {
            const appWizard: any = { [ADP_FLP_CONFIG_CACHE]: { provider: { test: '1' } } };

            initAppWizardCache(logger, appWizard);

            expect(appWizard[ADP_FLP_CONFIG_CACHE]).toEqual({ provider: { test: '1' } });
            expect(logger.debug).not.toHaveBeenCalled();
        });

        it('should do nothing if appWizard is undefined', () => {
            expect(() => initAppWizardCache(logger, undefined)).not.toThrow();
        });
    });

    describe('addToCache', () => {
        it('should add state to the cache', () => {
            const appWizard = { [ADP_FLP_CONFIG_CACHE]: {} };

            addToCache(
                appWizard as unknown as AppWizardCache,
                { provider: { test: '1' } as unknown as AbapServiceProvider },
                logger
            );

            expect(appWizard[ADP_FLP_CONFIG_CACHE]).toStrictEqual({ provider: { test: '1' } });
        });

        it('should do nothing if cache is missing', () => {
            const appWizard: any = {};

            addToCache(appWizard, { provider: {} as unknown as AbapServiceProvider }, logger);

            expect(appWizard[ADP_FLP_CONFIG_CACHE]).toBeUndefined();
        });

        it('should do nothing if appWizard is undefined', () => {
            expect(() =>
                addToCache(undefined, { provider: {} as unknown as AbapServiceProvider }, logger)
            ).not.toThrow();
        });
    });

    describe('getFromCache', () => {
        it('should return the cached value for the given key', () => {
            const appWizard: any = { [ADP_FLP_CONFIG_CACHE]: { provider: { test: '1' } } };

            const result = getFromCache(appWizard, 'provider', logger);

            expect(result).toStrictEqual({ test: '1' });
        });

        it('should return undefined if cache or key is missing', () => {
            const appWizard: any = {};

            expect(getFromCache(appWizard, 'provider', logger)).toBeUndefined();
            expect(getFromCache(undefined, 'provider', logger)).toBeUndefined();
        });
    });

    describe('deleteCache', () => {
        it('should delete the cache from appWizard', () => {
            const appWizard: any = { [ADP_FLP_CONFIG_CACHE]: { provider: { test: '1' } } };

            deleteCache(appWizard, logger);

            expect(appWizard[ADP_FLP_CONFIG_CACHE]).toBeUndefined();
        });

        it('should do nothing if cache is missing', () => {
            const appWizard: any = {};

            expect(() => deleteCache(appWizard, logger)).not.toThrow();
        });

        it('should do nothing if appWizard is undefined', () => {
            expect(() => deleteCache(undefined, logger)).not.toThrow();
        });
    });
});
