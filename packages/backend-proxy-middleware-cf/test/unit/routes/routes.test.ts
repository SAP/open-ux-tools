import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import { mergeEffectiveOptions } from '../../../src/config';
import { loadAndPrepareXsappConfig, buildRouteEntries } from '../../../src/routes';

describe('routes', () => {
    const rootPath = '/project/root';

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
                    allowServices: false
                }),
                sourcePath: path.join(rootPath, 'webapp')
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
                    allowLocalDir: false,
                    allowServices: false
                }),
                sourcePath: rootPath
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
                    allowServices: false
                }),
                sourcePath
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
    });

    describe('buildRouteEntries', () => {
        const logger = { info: jest.fn(), debug: jest.fn() } as unknown as ToolsLogger;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('builds route entries with re and path from xsappConfig', () => {
            const xsappConfig = {
                routes: [{ source: '^/api/(.*)$', destination: 'api' }],
                authenticationMethod: 'none'
            };
            const destinations = [{ name: 'api', url: '/api' }];

            const result = buildRouteEntries({
                xsappConfig,
                destinations,
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json', debug: true }),
                logger
            });

            expect(result).toHaveLength(1);
            expect(result[0].re).toBeInstanceOf(RegExp);
            expect(result[0].path).toBeDefined();
            expect(result[0].url).toBe('/api');
            expect(logger.debug).toHaveBeenCalledWith('Adding destination "api" proxying to ^/api/(.*)$');
        });

        test('returns empty array when xsappConfig has no routes', () => {
            const result = buildRouteEntries({
                xsappConfig: { routes: [] },
                destinations: [],
                effectiveOptions: mergeEffectiveOptions({ xsappJsonPath: './xs-app.json' }),
                logger
            });

            expect(result).toEqual([]);
            expect(logger.debug).not.toHaveBeenCalled();
        });
    });
});
