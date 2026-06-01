import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { CfConfig, Config } from '../../../../src/types';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockHomedir = jest.fn();
jest.unstable_mockModule('node:os', () => ({
    homedir: mockHomedir,
    default: { homedir: mockHomedir }
}));

const mockReadFileSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    readFileSync: mockReadFileSync,
    existsSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    default: {
        readFileSync: mockReadFileSync,
        existsSync: jest.fn(),
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        readdirSync: jest.fn(),
        statSync: jest.fn()
    }
}));

const { loadCfConfig } = await import('../../../../src/cf/core/config');

const defaultHome = '/home/user';

const mockConfig: Config = {
    AccessToken: 'bearer test-token',
    AuthorizationEndpoint: 'https://uaa.test.com',
    OrganizationFields: {
        Name: 'test-org',
        GUID: 'test-org-guid'
    },
    Target: 'https://api.cf.test.com',
    SpaceFields: {
        Name: 'test-space',
        GUID: 'test-space-guid'
    }
};

const expectedCfConfig: CfConfig = {
    org: {
        Name: 'test-org',
        GUID: 'test-org-guid'
    },
    space: {
        Name: 'test-space',
        GUID: 'test-space-guid'
    },
    token: 'test-token',
    url: 'test.com'
};

describe('CF Core Config', () => {
    const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment variables
        delete process.env.CF_HOME;
        delete process.env.HOMEDRIVE;
        delete process.env.HOMEPATH;
    });

    describe('loadCfConfig', () => {
        test('should load CF config from CF_HOME environment variable', () => {
            const cfHome = '/custom/cf/home';
            process.env.CF_HOME = cfHome;

            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const result = loadCfConfig(mockLogger);

            expect(result).toEqual(expectedCfConfig);
        });

        test('should load CF config from default home directory when CF_HOME is not set', () => {
            mockHomedir.mockReturnValue(defaultHome);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const result = loadCfConfig(mockLogger);

            expect(mockHomedir).toHaveBeenCalled();
            expect(result).toEqual(expectedCfConfig);
        });

        test('should handle Windows home directory with HOMEDRIVE and HOMEPATH', () => {
            const homeDrive = 'C:';
            const homePath = '\\Users\\TestUser';

            process.env.HOMEDRIVE = homeDrive;
            process.env.HOMEPATH = homePath;
            Object.defineProperty(process, 'platform', { value: 'win32' });

            mockHomedir.mockReturnValue('/default/home');

            const result = loadCfConfig(mockLogger);

            expect(result).toEqual(expectedCfConfig);
        });

        test('should not use HOMEDRIVE/HOMEPATH on non-Windows platforms', () => {
            process.env.HOMEDRIVE = 'C:';
            process.env.HOMEPATH = '\\Users\\TestUser';
            Object.defineProperty(process, 'platform', { value: 'linux' });

            mockHomedir.mockReturnValue(defaultHome);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const result = loadCfConfig(mockLogger);

            expect(mockHomedir).toHaveBeenCalled();
            expect(result).toEqual(expectedCfConfig);
        });

        test('should handle JSON parse errors gracefully', () => {
            const invalidJson = 'invalid json';

            mockHomedir.mockReturnValue('/home/user');
            mockReadFileSync.mockReturnValue(invalidJson);

            const result = loadCfConfig(mockLogger);

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot receive token from config.json');
            expect(result).toEqual({});
        });

        test('should handle empty config file', () => {
            mockHomedir.mockReturnValue('/home/user');
            mockReadFileSync.mockReturnValue('{}');

            const result = loadCfConfig(mockLogger);

            expect(result).toEqual({});
        });

        test('should extract URL correctly from Target', () => {
            const configWithTarget: Config = {
                ...mockConfig,
                Target: 'api.cf.example.com'
            };

            mockHomedir.mockReturnValue('/home/user');
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithTarget));

            const result = loadCfConfig(mockLogger);

            expect(result.url).toBe('example.com');
        });

        test('should extract token correctly from AccessToken', () => {
            const configWithToken: Config = {
                ...mockConfig,
                AccessToken: 'bearer my-secret-token'
            };

            mockHomedir.mockReturnValue('/home/user');
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithToken));

            const result = loadCfConfig(mockLogger);

            expect(result.token).toBe('my-secret-token');
        });
    });
});
