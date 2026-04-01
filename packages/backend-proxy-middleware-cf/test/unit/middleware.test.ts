import fs from 'node:fs';

import { createProxy } from '../../src/proxy/proxy';
import { nextFreePort } from '../../src/utils';
import { loadExtensions } from '../../src/approuter/extensions';
import { loadAndApplyEnvOptions } from '../../src/config/env';
import { startApprouter } from '../../src/approuter/approuter';
import { updateXsuaaService } from '../../src/platform/xssecurity';
import type { BackendProxyMiddlewareCfConfig } from '../../src/types';
import { loadAndPrepareXsappConfig, buildRouteEntries } from '../../src/proxy/routes';
import { fetchBasUrlTemplate, resolveBasExternalUrl } from '../../src/platform/bas';

const noopFn = jest.fn();
jest.mock('@sap-ux/logger', () => ({
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

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn()
}));

jest.mock('../../src/utils', () => ({
    ...jest.requireActual('../../src/utils'),
    nextFreePort: jest.fn()
}));

jest.mock('../../src/config/env', () => ({
    ...jest.requireActual('../../src/config/env'),
    loadAndApplyEnvOptions: jest.fn().mockResolvedValue([])
}));

jest.mock('../../src/proxy/routes', () => ({
    ...jest.requireActual('../../src/proxy/routes'),
    loadAndPrepareXsappConfig: jest.fn(),
    buildRouteEntries: jest.fn()
}));

jest.mock('../../src/approuter/extensions', () => ({
    ...jest.requireActual('../../src/approuter/extensions'),
    loadExtensions: jest.fn()
}));

jest.mock('../../src/approuter/approuter', () => ({
    startApprouter: jest.fn()
}));

jest.mock('../../src/proxy/proxy', () => ({ createProxy: jest.fn() }));

jest.mock('../../src/platform/bas', () => ({
    fetchBasUrlTemplate: jest.fn().mockResolvedValue(''),
    resolveBasExternalUrl: jest.fn().mockReturnValue(undefined)
}));

jest.mock('../../src/platform/xssecurity', () => ({
    updateXsuaaService: jest.fn().mockResolvedValue(undefined)
}));

const createProxyMock = createProxy as jest.Mock;
const existsSyncMock = fs.existsSync as jest.Mock;
const nextFreePortMock = nextFreePort as jest.Mock;
const loadExtensionsMock = loadExtensions as jest.Mock;
const buildRouteEntriesMock = buildRouteEntries as jest.Mock;
const loadAndApplyEnvOptionsMock = loadAndApplyEnvOptions as jest.Mock;
const loadAndPrepareXsappConfigMock = loadAndPrepareXsappConfig as jest.Mock;
const startApprouterMock = startApprouter as jest.Mock;
const fetchBasUrlTemplateMock = fetchBasUrlTemplate as jest.Mock;
const resolveBasExternalUrlMock = resolveBasExternalUrl as jest.Mock;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- middleware is CommonJS
const middleware = require('../../src/middleware') as (params: {
    options: { configuration?: BackendProxyMiddlewareCfConfig };
    middlewareUtil: { getProject: () => { getRootPath: () => string; getSourcePath: () => string } };
}) => Promise<unknown>;

describe('middleware', () => {
    const rootPath = '/project/root';
    const getProject = () => ({
        getRootPath: () => rootPath,
        getSourcePath: () => `${rootPath}/webapp`
    });

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.destinations;
        existsSyncMock.mockReturnValue(true);
        loadAndApplyEnvOptionsMock.mockResolvedValue([]);
        nextFreePortMock.mockResolvedValue(5000);
        loadAndPrepareXsappConfigMock.mockReturnValue({
            routes: [],
            login: { callbackEndpoint: '/login/callback' },
            logout: {}
        });
        buildRouteEntriesMock.mockReturnValue([]);
        loadExtensionsMock.mockReturnValue({ modules: [], routes: [] });
        createProxyMock.mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next());
        fetchBasUrlTemplateMock.mockResolvedValue('');
        resolveBasExternalUrlMock.mockReturnValue(undefined);
    });

    afterEach(() => {
        delete process.env.destinations;
    });

    test('throws when configuration is missing', async () => {
        await expect(middleware({ options: {}, middlewareUtil: { getProject } })).rejects.toThrow(
            'Backend proxy middleware (CF) has no configuration.'
        );
        expect(createProxyMock).not.toHaveBeenCalled();
    });

    test('throws when xs-app.json does not exist', async () => {
        existsSyncMock.mockReturnValue(false);

        await expect(
            middleware({
                options: { configuration: { xsappJsonPath: './xs-app.json' } },
                middlewareUtil: { getProject }
            })
        ).rejects.toThrow(/xs-app.json not found/);

        expect(createProxyMock).not.toHaveBeenCalled();
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

        expect(createProxyMock).toHaveBeenCalledTimes(1);
        const [proxyOptions, loggerArg] = createProxyMock.mock.calls[0] as [
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
        loadAndPrepareXsappConfigMock.mockReturnValue({
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

        expect(loadAndApplyEnvOptionsMock).toHaveBeenCalledWith(
            rootPath,
            expect.objectContaining({ envOptionsPath: './adp/default-env.json', destinations: [] }),
            expect.any(Object)
        );

        // Trigger lazy initialization by calling the handler
        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        const [proxyOptions] = createProxyMock.mock.calls[0] as [{ baseUri: string; customRoutes: string[] }];
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

        const [proxyOptions] = createProxyMock.mock.calls[0] as [{ customRoutes: string[] }];
        expect(proxyOptions.customRoutes).not.toContain('/');
    });

    test('should auto-create ui5-server destination when not configured', async () => {
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

        // Should have auto-created ui5-server destination
        expect(process.env.destinations).toBe(JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }]));
    });

    test('should update ui5-server destination when actual port differs from configured', async () => {
        // Set up initial destinations in process.env (simulating what loadAndApplyEnvOptions would do)
        process.env.destinations = JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }]);

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

        // Should have updated process.env.destinations with the new destination
        expect(process.env.destinations).toBe(JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8081' }]));
    });

    test('should not update process.env.destinations when actual port matches configured', async () => {
        // Set up initial destinations in process.env (simulating what loadAndApplyEnvOptions would do)
        process.env.destinations = JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }]);

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

        // Should not have updated process.env.destinations since port matches
        expect(process.env.destinations).toBe(JSON.stringify([{ name: 'ui5-server', url: 'http://localhost:8080' }]));
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
        expect(createProxyMock).toHaveBeenCalledTimes(1);
        expect(startApprouterMock).toHaveBeenCalledTimes(1);
    });

    test('should call fetchBasUrlTemplate during setup and pass resolved URL to createProxy', async () => {
        const basUrl = new URL('https://port8080-workspaces-xxx/');
        fetchBasUrlTemplateMock.mockResolvedValue('https://port0-workspaces-xxx/');
        resolveBasExternalUrlMock.mockReturnValue(basUrl);

        const handler = await middleware({
            options: { configuration: { xsappJsonPath: './xs-app.json' } },
            middlewareUtil: { getProject }
        });

        expect(fetchBasUrlTemplateMock).toHaveBeenCalledWith(expect.any(Object));

        const mockReq = { socket: { localPort: 8080 } };
        const mockRes = {};
        const mockNext = jest.fn();
        (handler as (req: unknown, res: unknown, next: () => void) => void)(mockReq, mockRes, mockNext);

        expect(resolveBasExternalUrlMock).toHaveBeenCalledWith('https://port0-workspaces-xxx/', 8080);
        const [proxyOptions] = createProxyMock.mock.calls[0] as [{ basExternalUrl?: URL }];
        expect(proxyOptions.basExternalUrl).toBe(basUrl);
    });
});
