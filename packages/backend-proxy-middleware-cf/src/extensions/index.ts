import type { ToolsLogger } from '@sap-ux/logger';

import type { ApprouterExtension } from '../types';

/** Extension module shape expected from approuter extensions */
interface ExtensionModule {
    insertMiddleware?: Record<
        string,
        Array<
            | ((req: unknown, res: unknown, next: unknown) => void)
            | { path?: string; handler: (req: unknown, res: unknown, next: unknown) => void }
        >
    >;
}

/**
 * Create a wrapper that injects parameters as 4th argument for approuter extension handlers.
 *
 * @param middleware - Original handler (req, res, next, params).
 * @param params - Parameters to inject (from extension config).
 * @returns Wrapper function with ≤3 args so approuter invokes it.
 */
function createParametersInjector(
    middleware: (req: unknown, res: unknown, next: unknown, params?: Record<string, string>) => void,
    params: Record<string, string> | undefined
): (this: unknown, req: unknown, res: unknown, next: unknown) => void {
    return function injectParameters(this: unknown, req: unknown, res: unknown, next: unknown): void {
        (req as Record<string, unknown>)['backend-proxy-middleware-cf'] = { parameters: params };
        middleware.apply(this, [req, res, next, params]);
    };
}

/**
 * Load and prepare extension modules for the approuter.
 *
 * @param rootPath - Project root path for resolving module paths.
 * @param extensions - Extension configs from effectiveOptions.
 * @param logger - Logger instance.
 * @returns Loaded extension modules and list of extension routes (paths) they register.
 */
export function loadExtensions(
    rootPath: string,
    extensions: ApprouterExtension[] | undefined,
    logger: ToolsLogger
): { extensionModules: ExtensionModule[]; extensionsRoutes: string[] } {
    const extensionsRoutes: string[] = [];
    const extensionModules = (extensions ?? [])
        .map((extension) => {
            try {
                const extensionModulePath = require.resolve(extension.module, { paths: [rootPath] });
                // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic user extension path
                const extensionModule = require(extensionModulePath) as ExtensionModule;
                const insertMiddleware = extensionModule?.insertMiddleware;
                if (insertMiddleware) {
                    for (const type of Object.keys(insertMiddleware)) {
                        insertMiddleware[type] = insertMiddleware[type].map((module) => {
                            if (typeof module === 'function') {
                                return createParametersInjector(module, extension.parameters);
                            }
                            if (module.path) {
                                extensionsRoutes.push(module.path);
                            }
                            module.handler = createParametersInjector(module.handler, extension.parameters);
                            return module;
                        });
                    }
                }
                return extensionModule;
            } catch {
                logger.warn(`Failed to resolve extension "${JSON.stringify(extension)}". Extension will be ignored.`);
                return undefined;
            }
        })
        .filter((e): e is ExtensionModule => e != null);

    return { extensionModules, extensionsRoutes };
}
