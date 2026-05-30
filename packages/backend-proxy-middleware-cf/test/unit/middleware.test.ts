import { jest } from '@jest/globals';
import type { BackendProxyMiddlewareCfConfig } from '../../src/types.js';

const mockExistsSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    default: { existsSync: mockExistsSync },
    existsSync: mockExistsSync
}));

const noopFn = jest.fn();
jest.unstable_mockModule('@sap-ux/logger', () => ({
    LogLevel: { Debug: 'debug', Info: 'info' },
    ToolsLogger: jest.fn().mockImplementation(() => ({
        debug: noopFn,
        info: noopFn,
        warn: noopFn,
        error: noopFn,
        log: noopFn
    })),
    UI5ToolingTransport: jest.fn()
}));

const mockNextFreePort = jest.fn();
jest.unstable_mockModule('../../src/utils', () => ({
    nextFreePort: mockNextFreePort
}));

const mockLoadEnvOptions = jest.fn().mockResolvedValue({});
const mockUpdateUi5ServerDestinationPort = jest.fn();
const mockGetConnectivityProxyInfo = jest.fn().mockReturnValue(undefined);
const mockApplyToProcessEnv = jest.fn();
jest.unstable_mockModule('../../src/config/env', () => ({
    loadEnvOptions: mockLoadEnvOptions,
    updateUi5ServerDestinationPort: mockUpdateUi5ServerDestinationPort,
    getConnectivityProxyInfo: mockGetConnectivityProxyInfo,
    applyToProcessEnv: mockApplyToProcessEnv
}));

const mockLoadAndPrepareXsappConfig = jest.fn();
const mockBuildRouteEntries = jest.fn();
jest.unstable_mockModule('../../src/proxy/routes', () => ({
    loadAndPrepareXsappConfig: mockLoadAndPrepareXsappConfig,
    buildRouteEntries: mockBuildRouteEntries
}));

const mockLoadExtensions = jest.fn();
jest.unstable_mockModule('../../src/approuter/extensions', () => ({
    loadExtensions: mockLoadExtensions
}));

const mockStartApprouter = jest.fn();
jest.unstable_mockModule('../../src/approuter/approuter', () => ({
    startApprouter: mockStartApprouter
}));

const mockCreateProxy = jest.fn();
jest.unstable_mockModule('../../src/proxy/proxy', () => ({
    createProxy: mockCreateProxy
}));

const mockFetchBasUrlTemplate = jest.fn().mockResolvedValue('');
const mockResolveBasExternalUrl = jest.fn().mockReturnValue(undefined);
jest.unstable_mockModule('../../src/platform/bas', () => ({
    fetchBasUrlTemplate: mockFetchBasUrlTemplate,
    resolveBasExternalUrl: mockResolveBasExternalUrl
}));

jest.unstable_mockModule('dotenv', () => ({
    default: { config: jest.fn() },
    config: jest.fn()
}));

jest.unstable_mockModule('../../src/platform/xssecurity', () => ({
    updateXsuaaService: jest.fn().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('../../src/config/config', () => ({
    mergeEffectiveOptions: jest.fn().mockImplementation((config) => ({
        ...config,
        destinations: config.destinations ?? [],
        port: 5000,
        xsappJsonPath: config.xsappJsonPath ?? './xs-app.json'
    }))
}));

jest.unstable_mockModule('../../src/tunnel/tunnel', () => ({
    setupSshTunnel: jest.fn().mockResolvedValue(undefined)
}));

// Import middleware - uses ESM export default
const { default: middleware } = (await import('../../src/middleware.js')) as {
    default: (params: {
        options: { configuration?: BackendProxyMiddlewareCfConfig };
        middlewareUtil: { getProject: () => { getRootPath: () => string; getSourcePath: () => string } };
    }) => Promise<unknown>;
};

describe('middleware', () => {
    const rootPath = '/project/root';
    const getProject = () => ({
        getRootPath: () => rootPath,
        getSourcePath: () => `${rootPath}/webapp`
    });

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.destinations;
        mockExistsSync.mockReturnValue(true);
        mockLoadEnvOptions.mockResolvedValue({});
        mockNextFreePort.mockResolvedValue(5000);
        mockLoadAndPrepareXsappConfig.mockReturnValue({
            routes: [],
            login: { callbackEndpoint: '/login/callback' },
            logout: {}
        });
        mockBuildRouteEntries.mockReturnValue([]);
        mockLoadExtensions.mockReturnValue({ modules: [], routes: [] });
        mockCreateProxy.mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next());
        mockFetchBasUrlTemplate.mockResolvedValue('');
        mockResolveBasExternalUrl.mockReturnValue(undefined);
    });

    afterEach(() => {
        delete process.env.destinations;
    });

    test('throws when configuration is missing', async () => {
        await expect(middleware({ options: {}, middlewareUtil: { getProject } })).rejects.toThrow(
            'Backend proxy middleware (CF) has no configuration.'
        );
        expect(mockCreateProxy).not.toHaveBeenCalled();
    });

    test('throws when xs-app.json does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        await expect(
            middleware({
                options: { configuration: { xsappJsonPath: './xs-app.json' } },
                middlewareUtil: { getProject }
            })
        ).rejects.toThrow(/xs-app.json not found/);

        expect(mockCreateProxy).not.toHaveBeenCalled();
    });

    test('should return request handler and call createProxy with expected options', async () => {
        const handler = await middleware({
            options: { configuration: { xsappJsonPath: './xs-app.json' } },
            middlewareUtil: { getProject }
        });

        expect(typeof handler).toBe('function');

        // Trigger lazy initialization by calling the handler
        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        expect(mockCreateProxy).toHaveBeenCalledTimes(1);
        const [proxyOptions, loggerArg] = mockCreateProxy.mock.calls[0] as [
            { baseUri: string; customRoutes: string[]; routes: unknown[]; effectiveOptions: unknown },
            unknown
        ];
        expect(proxyOptions.baseUri).toBe('http://localhost:5000');
        expect(proxyOptions.customRoutes).toContain('/');
        expect(proxyOptions.customRoutes).toContain('/login/callback');
        expect(proxyOptions.routes).toEqual([]);
        expect(proxyOptions.effectiveOptions).toBeDefined();
        expect(loggerArg).toBeDefined();
    });

    test('should apply subdomain, envOptionsPath, logout and globalThis correctly', async () => {
        mockLoadAndPrepareXsappConfig.mockReturnValue({
            routes: [],
            login: { callbackEndpoint: '/login/callback' },
            logout: { logoutEndpoint: '/logout' }
        });

        const handler = await middleware({
            options: {
                configuration: {
                    xsappJsonPath: './xs-app.json',
                    envOptionsPath: './adp/default-env.json',
                    subdomain: 'myapp'
                }
            },
            middlewareUtil: { getProject }
        });

        expect(mockLoadEnvOptions).toHaveBeenCalledWith(
            rootPath,
            expect.objectContaining({ envOptionsPath: './adp/default-env.json', destinations: [] }),
            expect.any(Object)
        );

        // Trigger lazy initialization by calling the handler
        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        const [proxyOptions] = mockCreateProxy.mock.calls[0] as [{ baseUri: string; customRoutes: string[] }];
        expect(proxyOptions.baseUri).toBe('http://myapp.localhost:5000');
        expect(proxyOptions.customRoutes).toContain('/logout');
    });

    test('should omit welcome route when disableWelcomeFile is true', async () => {
        const handler = await middleware({
            options: {
                configuration: { xsappJsonPath: './xs-app.json', disableWelcomeFile: true }
            },
            middlewareUtil: { getProject }
        });

        // Trigger lazy initialization by calling the handler
        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        const [proxyOptions] = mockCreateProxy.mock.calls[0] as [{ customRoutes: string[] }];
        expect(proxyOptions.customRoutes).not.toContain('/');
    });

    test('should auto-create ui5-server destination when not configured', async () => {
        mockUpdateUi5ServerDestinationPort.mockReturnValue(true);
        const handler = await middleware({
            options: {
                configuration: {
                    xsappJsonPath: './xs-app.json'
                    // No destinations configured
                }
            },
            middlewareUtil: { getProject }
        });

        // Trigger lazy initialization
        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        // Should have called updateUi5ServerDestinationPort with correct args
        expect(mockUpdateUi5ServerDestinationPort).toHaveBeenCalledWith(
            expect.objectContaining({ destinations: [] }),
            8080,
            undefined
        );
    });

    test('should update ui5-server destination when actual port differs from configured', async () => {
        mockUpdateUi5ServerDestinationPort.mockReturnValue(true);

        const handler = await middleware({
            options: {
                configuration: {
                    xsappJsonPath: './xs-app.json',
                    destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
                }
            },
            middlewareUtil: { getProject }
        });

        // Trigger lazy initialization with a different port (simulating multi-instance scenario)
        const mockReq = { socket: { localPort: 8081 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        // Should have called updateUi5ServerDestinationPort with correct port
        expect(mockUpdateUi5ServerDestinationPort).toHaveBeenCalledWith(
            expect.objectContaining({
                destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
            }),
            8081,
            undefined
        );
    });

    test('should not update process.env.destinations when actual port matches configured', async () => {
        mockUpdateUi5ServerDestinationPort.mockReturnValue(false);

        const handler = await middleware({
            options: {
                configuration: {
                    xsappJsonPath: './xs-app.json',
                    destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
                }
            },
            middlewareUtil: { getProject }
        });

        // Trigger lazy initialization with the same port
        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        // Should have called updateUi5ServerDestinationPort which returned false (no change)
        expect(mockUpdateUi5ServerDestinationPort).toHaveBeenCalledWith(
            expect.objectContaining({
                destinations: [{ name: 'ui5-server', url: 'http://localhost:8080' }]
            }),
            8080,
            undefined
        );
    });

    test('should only initialize approuter once on multiple requests', async () => {
        const handler = await middleware({
            options: { configuration: { xsappJsonPath: './xs-app.json' } },
            middlewareUtil: { getProject }
        });

        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();

        // Call handler multiple times
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        // createProxy and startApprouter should only be called once
        expect(mockCreateProxy).toHaveBeenCalledTimes(1);
        expect(mockStartApprouter).toHaveBeenCalledTimes(1);
    });

    test('should call fetchBasUrlTemplate during setup and pass resolved URL to createProxy', async () => {
        const basUrl = new URL('https://port8080-workspaces-xxx/');
        mockFetchBasUrlTemplate.mockResolvedValue('https://port0-workspaces-xxx/');
        mockResolveBasExternalUrl.mockReturnValue(basUrl);

        const handler = await middleware({
            options: { configuration: { xsappJsonPath: './xs-app.json' } },
            middlewareUtil: { getProject }
        });

        expect(mockFetchBasUrlTemplate).toHaveBeenCalledWith(expect.any(Object));

        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        expect(mockResolveBasExternalUrl).toHaveBeenCalledWith('https://port0-workspaces-xxx/', 8080);
        const [proxyOptions] = mockCreateProxy.mock.calls[0] as [{ basExternalUrl?: URL }];
        expect(proxyOptions.basExternalUrl).toBe(basUrl);
    });
});
