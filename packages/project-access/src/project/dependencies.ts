import type { Package } from '@sap-ux/project-types';

/**
 * Helper to check for dependency/devDependency.
 *
 * @param packageJson - content of package.json to check
 * @param dependency - name of the dependency
 * @returns - true: has dependency; false: no dependency
 */
export const hasDependency = (packageJson: Package, dependency: string): boolean =>
    (typeof packageJson.dependencies === 'object' && packageJson.dependencies[dependency] !== undefined) ||
    (typeof packageJson.devDependencies === 'object' && packageJson.devDependencies[dependency] !== undefined);
