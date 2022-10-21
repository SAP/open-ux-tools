import type { Package } from '../types';

/**
 * Helper to check for dependency/devDependency.
 *
 * @param packageJson - content of package.json to check
 * @param dependency - name of the dependency
 * @returns - true: has dependency; false: no dependency
 */
export const hasDependency = (packageJson: Package, dependency: string): boolean =>
    !!(packageJson.dependencies?.[dependency] || packageJson.devDependencies?.[dependency]);
