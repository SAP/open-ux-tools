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
 * @param middleware - Original handler (req, res, next, params).
 * @param params - Parameters to inject (from extension config).
 * @returns Wrapper function with ≤3 args so approuter invokes it.
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
 * @param rootPath - Project root path for resolving module paths.
 * @param extensions - Extension configs from effectiveOptions.
 * @param logger - Logger instance.
 * @returns Loaded extension modules and list of extension routes (paths) they register.
 */
export function loadExtensions(
    rootPath: string,
    extensions: ApprouterExtension[] | undefined,
    logger: ToolsLogger
): LoadedExtensions {
    const modules = (extensions ?? [])
        .map((extension) => toExtensionModule(extension, rootPath, logger))
        .filter((e): e is ExtensionModule => e != null);
    const routes = modules.flatMap(getExtensionRoutes);

    return { modules, routes };
}

/**
 * Collect route paths registered by an extension module via insertMiddleware.
 *
 * @param extensionModule - The extension module to inspect.
 * @returns Array of path strings from insertMiddleware entries that define a path.
 */
export function getExtensionRoutes(extensionModule: ExtensionModule): string[] {
    const insertMiddleware = extensionModule.insertMiddleware;
    if (!insertMiddleware) {
        return [];
    }
    const paths: string[] = [];
    for (const type of Object.keys(insertMiddleware)) {
        for (const entry of insertMiddleware[type]) {
            if (typeof entry !== 'function' && entry.path) {
                paths.push(entry.path);
            }
        }
    }
    return paths;
}

/**
 * Convert an extension config to a loaded extension module with parameter-injected handlers.
 * Does not mutate any shared state; use getExtensionRoutes to obtain paths from the returned module.
 *
 * @param extension - The extension to convert.
 * @param rootPath - The root path of the project for resolving the module.
 * @param logger - The logger to use.
 * @returns The extension module, or undefined if the module cannot be resolved.
 */
export function toExtensionModule(
    extension: ApprouterExtension,
    rootPath: string,
    logger: ToolsLogger
): ExtensionModule | undefined {
    try {
        const extensionModulePath = require.resolve(extension.module, { paths: [rootPath] });
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic user extension path
        const extensionModule = require(extensionModulePath) as ExtensionModule;
        const insertMiddleware = extensionModule?.insertMiddleware;

        if (!insertMiddleware) {
            return extensionModule;
        }

        for (const type of Object.keys(insertMiddleware)) {
            insertMiddleware[type] = insertMiddleware[type].map((module) => {
                if (typeof module === 'function') {
                    return createParametersInjector(module, extension.parameters);
                }
                module.handler = createParametersInjector(module.handler, extension.parameters);
                return module;
            });
        }

        return extensionModule;
    } catch {
        logger.warn(`Failed to resolve extension "${extension.module}". Extension will be ignored.`);
        return undefined;
    }
}
