import fs from 'node:fs';

import { createProxy } from '../../src/proxy';
import { nextFreePort } from '../../src/utils';
import { loadExtensions } from '../../src/extensions';
import { loadAndApplyEnvOptions } from '../../src/env';
import type { BackendProxyMiddlewareCfConfig } from '../../src/types';
import { loadAndPrepareXsappConfig, buildRouteEntries } from '../../src/routes';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn()
}));

jest.mock('../../src/utils', () => ({
    ...jest.requireActual('../../src/utils'),
    nextFreePort: jest.fn()
}));

jest.mock('../../src/env', () => ({
    ...jest.requireActual('../../src/env'),
    loadAndApplyEnvOptions: jest.fn().mockResolvedValue([])
}));

jest.mock('../../src/routes', () => ({
    ...jest.requireActual('../../src/routes'),
    loadAndPrepareXsappConfig: jest.fn(),
    buildRouteEntries: jest.fn()
}));
jest.mock('../../src/extensions', () => ({
    ...jest.requireActual('../../src/extensions'),
    loadExtensions: jest.fn()
}));

const mockApprouterStart = jest.fn();
jest.mock('@sap/approuter', () => () => ({
    start: mockApprouterStart
}));

jest.mock('../../src/proxy', () => ({ createProxy: jest.fn() }));

const createProxyMock = createProxy as jest.Mock;
const existsSyncMock = fs.existsSync as jest.Mock;
const nextFreePortMock = nextFreePort as jest.Mock;
const loadExtensionsMock = loadExtensions as jest.Mock;
const buildRouteEntriesMock = buildRouteEntries as jest.Mock;
const loadAndApplyEnvOptionsMock = loadAndApplyEnvOptions as jest.Mock;
const loadAndPrepareXsappConfigMock = loadAndPrepareXsappConfig as jest.Mock;

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
        const g = globalThis as unknown as Record<string, { approuters: unknown[] }>;
        g['backend-proxy-middleware-cf'] = { approuters: [] };
        loadAndPrepareXsappConfigMock.mockReturnValue({
            routes: [],
            login: { callbackEndpoint: '/login/callback' },
            logout: { logoutEndpoint: '/logout' }
        });

        await middleware({
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
        const [proxyOptions] = createProxyMock.mock.calls[0] as [{ baseUri: string; customRoutes: string[] }];
        expect(proxyOptions.baseUri).toBe('http://myapp.localhost:5000');
        expect(proxyOptions.customRoutes).toContain('/logout');
        expect(g['backend-proxy-middleware-cf'].approuters).toHaveLength(1);
        delete g['backend-proxy-middleware-cf'];
    });

    test('should omit welcome route when disableWelcomeFile is true', async () => {
        await middleware({
            options: {
                configuration: { xsappJsonPath: './xs-app.json', disableWelcomeFile: true }
            },
            middlewareUtil: { getProject }
        });

        const [proxyOptions] = createProxyMock.mock.calls[0] as [{ customRoutes: string[] }];
        expect(proxyOptions.customRoutes).not.toContain('/');
    });
});
