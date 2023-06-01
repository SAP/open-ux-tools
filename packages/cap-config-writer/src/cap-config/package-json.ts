import { gte } from 'semver';
import { getCapCustomPaths } from '@sap-ux/project-access';
import type { Package } from '@sap-ux/project-access';

const minCdsVersion = '6.8.2';

/**
 * Ensure a minimum version of @sap/cds in dependencies.
 *
 * @param packageJson - the parsed package.json
 */
export function ensureMinCdsVersion(packageJson: Package): void {
    if (!hasMinCdsVersion(packageJson)) {
        packageJson.dependencies ||= {};
        packageJson.dependencies['@sap/cds'] = `^${minCdsVersion}`;
    }
}

/**
 * Enable workspaces for app/* folders.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param packageJson - the parsed package.json
 */
export async function enableWorkspaces(basePath: string, packageJson: Package): Promise<void> {
    const { appWorkspace, workspaceEnabled } = await getWorkspaceInfo(basePath, packageJson);
    if (!workspaceEnabled) {
        packageJson.workspaces ||= [];
        if (Array.isArray(packageJson.workspaces)) {
            packageJson.workspaces.push(appWorkspace);
        }
    }
}

/**
 * Add devDependency to cds-plugin-ui5.
 *
 * @param packageJson - the parsed package.json
 */
export function addCdsPluginUi5(packageJson: Package): void {
    if (!hasCdsPluginUi5(packageJson)) {
        packageJson.devDependencies ||= {};
        packageJson.devDependencies['cds-plugin-ui5'] = 'latest';
    }
}

/**
 * Check if the min version of @sap/cds is present in the package.json.
 *
 * @param packageJson - the parsed package.json
 * @returns - true: min cds version is present; false: cds version needs update
 */
export function hasMinCdsVersion(packageJson: Package): boolean {
    return gte(packageJson.dependencies?.['@sap/cds'] ?? '0.0.0', minCdsVersion);
}

/**
 * Get information about the workspaces in the CAP project.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param packageJson - the parsed package.json
 * @returns - appWorkspace containing the path to the appWorkspace including wildcard; workspaceEnabled: boolean that states whether workspace for apps are enabled
 */
export async function getWorkspaceInfo(
    basePath: string,
    packageJson: Package
): Promise<{ appWorkspace: string; workspaceEnabled: boolean }> {
    const capPaths = await getCapCustomPaths(basePath);
    const appWorkspace = capPaths.app.endsWith('/') ? `${capPaths.app}*` : `${capPaths.app}/*`;
    const workspaceEnabled = Array.isArray(packageJson.workspaces) && packageJson.workspaces.includes(appWorkspace);
    return { appWorkspace, workspaceEnabled };
}

/**
 * Check if devDependency to cds-plugin-ui5 is present in package.json.
 *
 * @param packageJson - the parsed package.json
 * @returns true: devDependency to cds-plugin-ui5 exists; false: devDependency to cds-plugin-ui5 does not exist
 */
export function hasCdsPluginUi5(packageJson: Package): boolean {
    return !!packageJson.devDependencies?.['cds-plugin-ui5'];
}
