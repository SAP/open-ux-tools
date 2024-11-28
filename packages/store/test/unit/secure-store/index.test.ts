import { getSecureStore } from '../../../src/secure-store';
import { KeyStoreManager } from '../../../src/secure-store/key-store';
import { DummyStore } from '../../../src/secure-store/dummy-store';
import * as utils from '../../../src/utils';
import type { Logger } from '@sap-ux/logger';

jest.mock('../../../src/utils', () => ({
    ...jest.requireActual('../../../src/utils'),
    isAppStudio: jest.fn(),
}));

// Mock KeyStoreManager to simulate its unavailability
jest.mock('../../../src/secure-store/key-store', () => {
    return {
        KeyStoreManager: jest.fn().mockImplementation(() => {
            throw new Error('KeyStoreManager unavailable');
        }),
    };
});

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
} as unknown as Logger;

describe('getSecureStore', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(async () => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    const mockIsAppStudio = (value: boolean) => {
        (utils.isAppStudio as jest.Mock).mockReturnValue(value);
    };

    it('should return DummyStore when KeyStoreManager is unavailable', () => {
        mockIsAppStudio(false);
        const result = getSecureStore(mockLogger);
        expect(result).toBeInstanceOf(DummyStore);
        expect(utils.isAppStudio).toHaveBeenCalled();
    });

    it('should return DummyStore when running in AppStudio', () => {
        mockIsAppStudio(true);
        const result = getSecureStore(mockLogger);
        expect(result).toBeInstanceOf(DummyStore);
        expect(utils.isAppStudio).toHaveBeenCalled();
    });

    it('should return KeyStoreManager when not in AppStudio and available', () => {
        // Restore KeyStoreManager
        jest.unmock('../../../src/secure-store/key-store');
        mockIsAppStudio(false);
        const result = getSecureStore(mockLogger);
        expect(result).toBeInstanceOf(KeyStoreManager);
        expect(utils.isAppStudio).toHaveBeenCalled();
    });

    it('should return DummyStore when FIORI_TOOLS_DISABLE_SECURE_STORE is true', () => {
        process.env.FIORI_TOOLS_DISABLE_SECURE_STORE = 'true';
        mockIsAppStudio(false);
        const result = getSecureStore(mockLogger);
        expect(result).toBeInstanceOf(DummyStore);
        expect(utils.isAppStudio).toHaveBeenCalled();
    });

    it('should return KeyStoreManager when FIORI_TOOLS_DISABLE_SECURE_STORE is undefined', () => {
        delete process.env.FIORI_TOOLS_DISABLE_SECURE_STORE;
        mockIsAppStudio(false);
        const result = getSecureStore(mockLogger);
        expect(result).toBeInstanceOf(KeyStoreManager);
        expect(utils.isAppStudio).toHaveBeenCalled();
    });

    it('should return KeyStoreManager when FIORI_TOOLS_DISABLE_SECURE_STORE is false', () => {
        delete process.env.FIORI_TOOLS_DISABLE_SECURE_STORE;
        mockIsAppStudio(false);
        const result = getSecureStore(mockLogger);
        expect(result).toBeInstanceOf(KeyStoreManager);
        expect(utils.isAppStudio).toHaveBeenCalled();
    });
});
