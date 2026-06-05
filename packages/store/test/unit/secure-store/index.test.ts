import { jest } from '@jest/globals';

const mockIsAppStudio = jest.fn<() => boolean>();

jest.unstable_mockModule('../../../src/utils/app-studio', () => ({
    isAppStudio: mockIsAppStudio,
    ENV: { PROXY_URL: 'HTTP_PROXY', H2O_URL: 'H2O_URL' }
}));

const mockExistsSync = jest.fn<(path: string) => boolean>();
const mockReaddirSync = jest.fn<typeof actualFs.readdirSync>();

// Import actual fs BEFORE mocking to avoid infinite resolution loops
const actualFs = await import('node:fs');

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: { ...actualFs.default, existsSync: mockExistsSync, readdirSync: mockReaddirSync },
    existsSync: mockExistsSync,
    readdirSync: mockReaddirSync
}));

// Import actual os BEFORE mocking to get the real functions
const actualOs = await import('node:os');

jest.unstable_mockModule('node:os', () => ({
    ...actualOs,
    default: { ...actualOs.default, homedir: () => 'test_dir' },
    homedir: () => 'test_dir'
}));

// Configurable mock for createRequire — allows per-test control over zowe SDK loading
const mockRequireForZowe = jest.fn() as jest.Mock;

const actualModule = await import('node:module');
jest.unstable_mockModule('node:module', () => ({
    ...actualModule,
    createRequire: (url: string) => {
        const realRequire = actualModule.createRequire(url);
        return (id: string) => {
            if (id === '@zowe/secrets-for-zowe-sdk' || id.replace(/\\/g, '/').includes('@zowe/secrets-for-zowe-sdk')) {
                return mockRequireForZowe(id);
            }
            return realRequire(id);
        };
    }
}));

const { getSecureStore } = await import('../../../src/secure-store/index.js');
const { DummyStore } = await import('../../../src/secure-store/dummy-store.js');
const { KeyStoreManager } = await import('../../../src/secure-store/key-store.js');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('getSecureStore', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockRequireForZowe.mockImplementation(() => {
            throw new Error('Cannot find module @zowe/secrets-for-zowe-sdk');
        });
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
            jest.resetAllMocks();
            mockIsAppStudio.mockReturnValue(false);
            mockRequireForZowe.mockImplementation(() => {
                throw new Error('Cannot find module @zowe/secrets-for-zowe-sdk');
            });
        });

        it('returns KeyStoreManager if zowe sdk is loaded successfully', () => {
            const mockKeyring = { setPassword: jest.fn(), getPassword: jest.fn(), deletePassword: jest.fn() };
            mockRequireForZowe.mockReturnValue({ keyring: mockKeyring });
            expect(getSecureStore(nullLogger)).toBeInstanceOf(KeyStoreManager);
        });

        it('returns DummyStore if zowe sdk loads but keyring is undefined', () => {
            mockRequireForZowe.mockReturnValue({ keyring: undefined });
            mockExistsSync.mockReturnValue(false);
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });

        it('returns KeyStoreManager from application modeler extension fallback', () => {
            const mockKeyring = { setPassword: jest.fn(), getPassword: jest.fn(), deletePassword: jest.fn() };
            // Direct load fails
            mockRequireForZowe.mockImplementationOnce(() => {
                throw new Error('Cannot find module @zowe/secrets-for-zowe-sdk');
            });
            // Fallback load succeeds
            mockRequireForZowe.mockReturnValueOnce({ keyring: mockKeyring });

            // Extensions directory exists and contains app modeler extension
            mockExistsSync.mockImplementation((p) => {
                if (typeof p === 'string' && p.includes('extensions')) {
                    return true;
                }
                if (typeof p === 'string' && p.includes('package.json')) {
                    return true;
                }
                return false;
            });
            mockReaddirSync.mockReturnValue(['sapse.sap-ux-application-modeler-extension-1.14.1']);

            expect(getSecureStore(nullLogger)).toBeInstanceOf(KeyStoreManager);
        });

        it('returns DummyStore if zowe sdk cannot be loaded and no fallback paths exist', () => {
            mockExistsSync.mockReturnValue(false);
            mockReaddirSync.mockReturnValue([]);
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });

        it('returns DummyStore if zowe sdk fails and fallback extensions directory does not exist', () => {
            mockExistsSync.mockReturnValue(false);
            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });

        it('returns DummyStore when zowe sdk fails and all fallback paths also fail', () => {
            // Extensions directory exists with app modeler extension
            mockExistsSync.mockImplementation((p) => {
                if (typeof p === 'string' && p.includes('extensions')) {
                    return true;
                }
                // package.json exists
                if (typeof p === 'string' && p.includes('package.json')) {
                    return true;
                }
                return false;
            });
            mockReaddirSync.mockReturnValue(['sapse.sap-ux-application-modeler-extension-1.14.1']);

            // Both direct and fallback loads fail
            mockRequireForZowe.mockImplementation(() => {
                throw new Error('Cannot find module @zowe/secrets-for-zowe-sdk');
            });

            expect(getSecureStore(nullLogger)).toBeInstanceOf(DummyStore);
        });
    });
});
