import { resolve } from 'path';

/**
 * Attempts to resolve the path to a specific node module generator from the NODE_PATH environment variable.
 *
 * @returns {string | undefined} The resolved path to the generator module if found, or undefined if not found.
 */
export function resolveNodeModuleGenerator(): string | undefined {
    const nodePath = process.env['NODE_PATH'];
    const nodePaths = nodePath?.split(':') ?? [];

    let generator: string | undefined;
    for (const path of nodePaths) {
        try {
            generator = require.resolve(resolve(path, '@bas-dev/generator-extensibility-sub/generators/app'));
        } catch (e) {
            /**
             * We don't care if there's an error while resolving the module, continue with the next node_module path
             */
        }

        if (generator !== undefined) {
            break;
        }
    }

    return generator;
}
