import { jest } from '@jest/globals';

const mockIsAppStudio = jest.fn<() => boolean>();

jest.unstable_mockModule('../../../src/utils/app-studio', () => ({
    isAppStudio: mockIsAppStudio,
    ENV: { PROXY_URL: 'HTTP_PROXY', H2O_URL: 'H2O_URL' }
}));

const mockExistsSync = jest.fn<(path: string) => boolean>();
const mockReaddirSync = jest.fn();

// Import actual fs BEFORE mocking to avoid infinite resolution loops
const actualFs = await import('node:fs');

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: { ...actualFs.default, existsSync: mockExistsSync, readdirSync: mockReaddirSync },
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync
}));

jest.unstable_mockModule('node:os', () => ({
    default: { homedir: () => 'test_dir' },
    homedir: () => 'test_dir'
}));

// Mock createRequire so the source module's require() throws for '@zowe/secrets-for-zowe-sdk'
const actualModule = await import('node:module');
jest.unstable_mockModule('node:module', () => ({
    ...actualModule,
    createRequire: (url: string) => {
        const realRequire = actualModule.createRequire(url);
        return (id: string) => {
            if (id === '@zowe/secrets-for-zowe-sdk') {
                throw new Error('Cannot find module @zowe/secrets-for-zowe-sdk');
            }
            return realRequire(id);
        };
    }
}));

const { getSecureStore } = await import('../../../src/secure-store');
const { DummyStore } = await import('../../../src/secure-store/dummy-store');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('getSecureStore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });

    it('returns an instance of DummyStore on App Studio', () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
    });

    it('returns DummyStore if environment variable FIORI_TOOLS_DISABLE_SECURE_STORE is set', () => {
        mockIsAppStudio.mockReturnValue(false);
        process.env.FIORI_TOOLS_DISABLE_SECURE_STORE = 'true';
        expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        delete process.env.FIORI_TOOLS_DISABLE_SECURE_STORE;
    });

    describe('non App Studio', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            mockIsAppStudio.mockReturnValue(false);
        });

        it('returns DummyStore when zowe sdk cannot be loaded and no fallback exists', () => {
            mockExistsSync.mockReturnValue(false);
            mockReaddirSync.mockReturnValue([]);
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
    });
});
