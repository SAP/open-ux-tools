import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import { loadExtensions, toExtensionModule } from '../../../src/extensions';

describe('extensions', () => {
    const logger = { warn: jest.fn() } as unknown as ToolsLogger;

    const rootPath = __dirname;
    const fixturesDir = path.join(__dirname, '../../fixtures/extensions');

    describe('loadExtensions', () => {
        test('returns empty modules and routes when extensions is undefined', () => {
            const result = loadExtensions(rootPath, undefined, logger);

            expect(result.modules).toEqual([]);
            expect(result.routes).toEqual([]);
        });

        test('ignores extension that fails to resolve and logs warning', () => {
            const result = loadExtensions(rootPath, [{ module: './nonexistent-extension-xyz' }], logger);

            expect(result.modules).toEqual([]);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('nonexistent-extension-xyz'));
        });

        test('loads extension module and pushes route paths from insertMiddleware', () => {
            const result = loadExtensions(fixturesDir, [{ module: './mock-extension.cjs' }], logger);

            expect(result.modules).toHaveLength(1);
            expect(result.modules[0].insertMiddleware).toBeDefined();
            expect(result.routes).toContain('/custom-route');
        });
    });

    describe('toExtensionModule', () => {
        test('returns module unchanged when insertMiddleware is missing', () => {
            const routes: string[] = [];
            const result = toExtensionModule({ module: './mock-extension-no-insert.cjs' }, fixturesDir, routes, logger);

            expect(result).toBeDefined();
            expect(result!.insertMiddleware).toBeUndefined();
            expect(routes).toHaveLength(0);
        });

        test('returns undefined and warns when module cannot be resolved', () => {
            const routes: string[] = [];
            const result = toExtensionModule({ module: './does-not-exist-abc' }, rootPath, routes, logger);
            expect(result).toBeUndefined();
            expect(logger.warn).toHaveBeenCalled();
        });

        test('returns module with wrapped handlers and pushes path to routes', () => {
            const routes: string[] = [];
            const result = toExtensionModule(
                { module: './mock-extension.cjs', parameters: { key: 'value' } },
                fixturesDir,
                routes,
                logger
            );
            expect(result).toBeDefined();
            expect(result!.insertMiddleware).toBeDefined();
            expect(routes).toContain('/custom-route');
        });

        test('wrapped handler injects parameters and invokes original (createParametersInjector)', () => {
            const routes: string[] = [];
            const result = toExtensionModule(
                { module: './mock-extension-with-params.cjs', parameters: { foo: 'bar' } },
                fixturesDir,
                routes,
                logger
            );
            const beforeRequest = result!.insertMiddleware!.beforeRequest!;
            const wrappedHandler = beforeRequest[0] as (req: unknown, res: unknown, next: () => void) => void;
            const req: Record<string, unknown> = {};
            const next = jest.fn();

            wrappedHandler(req, {}, next);

            expect(req['backend-proxy-middleware-cf']).toEqual({ parameters: { foo: 'bar' } });
            expect(next).toHaveBeenCalled();
        });
    });
});
