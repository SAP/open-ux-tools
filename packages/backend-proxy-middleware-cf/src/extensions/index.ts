import type { ToolsLogger } from '@sap-ux/logger';

import type { ApprouterExtension } from '../types';

/** Approuter extension handler: Express-like (req, res, next) with optional 4th params from config */
export type ExtensionHandler = (req: unknown, res: unknown, next: unknown, params?: Record<string, string>) => void;

/** Extension module shape expected from approuter extensions */
interface ExtensionModule {
    insertMiddleware?: Record<string, Array<ExtensionHandler | { path?: string; handler: ExtensionHandler }>>;
}

/**
 * Loaded extension modules and list of extension routes (paths) they register.
 */
export interface LoadedExtensions {
    modules: ExtensionModule[];
    routes: string[];
}

/**
 * Create a wrapper that injects parameters as 4th argument for approuter extension handlers.
 *
 * @param {ExtensionHandler} middleware - Original handler (req, res, next, params).
 * @param {Record<string, string> | undefined} params - Parameters to inject (from extension config).
 * @returns {ExtensionHandler} Wrapper function with ≤3 args so approuter invokes it.
 */
function createParametersInjector(
    middleware: ExtensionHandler,
    params: Record<string, string> | undefined
): ExtensionHandler {
    return function injectParameters(this: unknown, req: unknown, res: unknown, next: unknown): void {
        (req as Record<string, unknown>)['backend-proxy-middleware-cf'] = { parameters: params };
        middleware.apply(this, [req, res, next, params]);
    };
}

/**
 * Load and prepare extension modules for the approuter.
 *
 * @param {string} rootPath - Project root path for resolving module paths.
 * @param {ApprouterExtension[] | undefined} extensions - Extension configs from effectiveOptions.
 * @param {ToolsLogger} logger - Logger instance.
 * @returns {LoadedExtensions} Loaded extension modules and list of extension routes (paths) they register.
 */
export function loadExtensions(
    rootPath: string,
    extensions: ApprouterExtension[] | undefined,
    logger: ToolsLogger
): LoadedExtensions {
    const routes: string[] = [];
    const modules = (extensions ?? [])
        .map((extension) => toExtensionModule(extension, rootPath, routes, logger))
        .filter((e): e is ExtensionModule => e != null);

    return { modules, routes };
}

/**
 * Convert an extension to an extension module.
 *
 * @param {ApprouterExtension} extension - The extension to convert.
 * @param {string} rootPath - The root path of the project.
 * @param {string[]} routes - The routes to add to the extension module.
 * @param {ToolsLogger} logger - The logger to use.
 * @returns {ExtensionModule | undefined} The extension module.
 */
export function toExtensionModule(
    extension: ApprouterExtension,
    rootPath: string,
    routes: string[],
    logger: ToolsLogger
): ExtensionModule | undefined {
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
                        routes.push(module.path);
                    }
                    module.handler = createParametersInjector(module.handler, extension.parameters);
                    return module;
                });
            }
        }
        return extensionModule;
    } catch {
        logger.warn(`Failed to resolve extension "${extension.module}". Extension will be ignored.`);
        return undefined;
    }
}
