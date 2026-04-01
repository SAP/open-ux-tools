import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import { mergeEffectiveOptions } from '../../../src/config/config';
import { loadAndPrepareXsappConfig, buildRouteEntries } from '../../../src/proxy/routes';

describe('routes', () => {
    const rootPath = '/project/root';
    const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    describe('loadAndPrepareXsappConfig', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        test('loads xs-app and applies authenticationMethod', () => {
            const xsappContent = {
                routes: [{ source: '^/backend/(.*)$', destination: 'backend' }],
                authenticationMethod: 'route'
            };
            jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(xsappContent));
            const xsappPath = path.join(rootPath, 'xs-app.json');

            const result = loadAndPrepareXsappConfig({
                rootPath,
                xsappJsonPath: xsappPath,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    authenticationMethod: 'none',
                    allowLocalDir: false,
                    allowServices: false,
                    disableUi5ServerRoutes: true // disable to test only existing routes
                }),
                sourcePath: path.join(rootPath, 'webapp'),
                logger: mockLogger
            });

            expect(result.authenticationMethod).toBe('none');
            expect(result.routes).toHaveLength(1);
            expect(result.routes![0].authenticationType).toBe('none');
        });

        test('removes welcomeFile when disableWelcomeFile is true', () => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ welcomeFile: 'index.html', routes: [] }));
            const xsappPath = path.join(rootPath, 'xs-app.json');

            const result = loadAndPrepareXsappConfig({
                rootPath,
                xsappJsonPath: xsappPath,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    disableWelcomeFile: true,
                    disableUi5ServerRoutes: true, // disable to test only welcomeFile behavior
                    allowLocalDir: false,
                    allowServices: false
                }),
                sourcePath: rootPath,
                logger: mockLogger
            });

            expect(result.welcomeFile).toBeUndefined();
        });

        test('appends auth route when appendAuthRoute is true and authenticationMethod is not none', () => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ routes: [] }));
            const xsappPath = path.join(rootPath, 'xs-app.json');
            const sourcePath = path.join(rootPath, 'webapp');

            const result = loadAndPrepareXsappConfig({
                rootPath,
                xsappJsonPath: xsappPath,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    appendAuthRoute: true,
                    authenticationMethod: 'route',
                    allowLocalDir: false,
                    allowServices: false,
                    disableUi5ServerRoutes: true // disable to test only auth route
                }),
                sourcePath,
                logger: mockLogger
            });

            expect(result.routes).toHaveLength(1);
            expect(result.routes![0]).toMatchObject({
                source: String.raw`^/([^.]+\\.html?(?:\?.*)?)$`,
                localDir: 'webapp',
                target: '$1',
                cacheControl: 'no-store',
                authenticationType: 'xsuaa'
            });
        });

        test('injects ui5-server auth route by default', () => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ routes: [] }));
            const xsappPath = path.join(rootPath, 'xs-app.json');

            const result = loadAndPrepareXsappConfig({
                rootPath,
                xsappJsonPath: xsappPath,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    allowLocalDir: false,
                    allowServices: false
                }),
                sourcePath: rootPath,
                logger: mockLogger
            });

            // Should have only the HTML auth route (no /resources, /test-resources, or catch-all)
            expect(result.routes).toHaveLength(1);
            expect(result.routes![0]).toMatchObject({
                source: String.raw`^/(test|local)/.*\.html.*$`,
                destination: 'ui5-server',
                authenticationType: 'xsuaa'
            });
        });

        test('does not inject ui5-server routes when disableUi5ServerRoutes is true', () => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ routes: [] }));
            const xsappPath = path.join(rootPath, 'xs-app.json');

            const result = loadAndPrepareXsappConfig({
                rootPath,
                xsappJsonPath: xsappPath,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    disableUi5ServerRoutes: true,
                    allowLocalDir: false,
                    allowServices: false
                }),
                sourcePath: rootPath,
                logger: mockLogger
            });

            expect(result.routes).toHaveLength(0);
        });

        test('appends ui5-server auth route after existing routes', () => {
            const xsappContent = {
                routes: [{ source: '^/backend/(.*)$', destination: 'backend' }]
            };
            jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(xsappContent));
            const xsappPath = path.join(rootPath, 'xs-app.json');

            const result = loadAndPrepareXsappConfig({
                rootPath,
                xsappJsonPath: xsappPath,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    allowLocalDir: false,
                    allowServices: false
                }),
                sourcePath: rootPath,
                logger: mockLogger
            });

            // Should have 1 existing route + 1 ui5-server auth route
            expect(result.routes).toHaveLength(2);
            expect(result.routes![0].destination).toBe('backend');
            expect(result.routes![1].destination).toBe('ui5-server');
            expect(result.routes![1].source).toBe(String.raw`^/(test|local)/.*\.html.*$`);
        });
    });

    describe('buildRouteEntries', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('builds route entries with sourcePattern and path from xsappConfig', () => {
            const xsappConfig = {
                routes: [{ source: '^/api/(.*)$', destination: 'api' }],
                authenticationMethod: 'none'
            };

            const result = buildRouteEntries({
                xsappConfig,
                effectiveOptions: mergeEffectiveOptions({
                    xsappJsonPath: './xs-app.json',
                    debug: true,
                    destinations: [{ name: 'api', url: '/api' }]
                }),
                logger: mockLogger
            });

            expect(result).toHaveLength(1);
            expect(result[0].sourcePattern).toBeInstanceOf(RegExp);
            expect(result[0].path).toBeDefined();
            expect(result[0].url).toBe('/api');
            expect(mockLogger.debug).toHaveBeenCalledWith('Adding destination "api" proxying to ^/api/(.*)$');
        });

        test('logs warning and skips route when source pattern has no slash', () => {
            const xsappConfig = {
                routes: [{ source: '^$', destination: 'root' }],
                authenticationMethod: 'none'
            };

            const result = buildRouteEntries({
                xsappConfig,
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger: mockLogger
            });

            expect(result).toEqual([]);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Skipping route with source "^$": could not extract path prefix.'
            );
        });

        test('returns empty array when xsappConfig has no routes', () => {
            const result = buildRouteEntries({
                xsappConfig: { routes: [] },
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger: mockLogger
            });

            expect(result).toEqual([]);
            expect(mockLogger.debug).not.toHaveBeenCalled();
        });
    });
});
