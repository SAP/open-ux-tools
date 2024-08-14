import { readdirSync } from 'fs';
import { resolve } from 'path';

const APP_VARIANT_REGEX = /^app[.]variant[0-9]{1,3}$/;

/**
 * Retrieves a list of project directory names that match a specific naming pattern from the given directory path.
 *
 * @param {string} path - The directory path from which to list project names.
 * @param {RegExp} regex - The specific naming pattern to filter by.
 * @returns {string[]} An array of project names that match the pattern /^app\.variant[0-9]{1,3}$/, sorted in reverse order.
 */
export function getProjectNames(path: string, regex: RegExp = APP_VARIANT_REGEX): string[] {
    return readdirSync(path, { withFileTypes: true })
        .filter((dirent) => !dirent.isFile() && regex.test(dirent.name))
        .map((dirent) => dirent.name)
        .sort((a, b) => a.localeCompare(b))
        .reverse();
}

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
