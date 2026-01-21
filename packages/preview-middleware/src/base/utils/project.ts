// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { MiddlewareUtils } from '@ui5/server';
import { posix } from 'node:path';

/**
 * Get the sandbox path prefix for component projects.
 * Component projects need a special path prefix based on their namespace.
 *
 * @param utils middleware utils
 * @returns sandbox path prefix or undefined
 */
export function getSandboxPathPrefix(utils?: MiddlewareUtils): string | undefined {
    //todo: rename to getTestResourcesPathPrefix;
    if (typeof utils !== 'object') {
        return undefined;
    }
    return utils.getProject?.()?.getType?.() === 'component'
        ? posix.join('/test-resources', utils.getProject().getNamespace())
        : undefined;
}

/**
 * Get the sources path prefix for component projects.
 * Component projects need a special path prefix based on their namespace.
 *
 * @param utils middleware utils
 * @returns resources path prefix or undefined
 */
export function getResourcesPathPrefix(utils?: MiddlewareUtils): string | undefined {
    if (typeof utils !== 'object') {
        return undefined;
    }
    return utils.getProject?.()?.getType?.() === 'component'
        ? posix.join('/resources', utils.getProject().getNamespace())
        : undefined;
}

/**
 * Adjust a path by removing the leading /test prefix if a sandbox path prefix exists.
 * This is needed for component projects where the /test path is handled by the sandbox path prefix.
 *
 * @param path the path to adjust
 * @param sandboxPathPrefix the sandbox path prefix (if exists)
 * @returns the adjusted path
 */
export function adjustPathForSandbox(path: string, sandboxPathPrefix?: string): string {
    return sandboxPathPrefix ? path.replace(/^\/test/, '') : path;
}
