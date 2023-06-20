import { coerce, gte, satisfies } from 'semver';
import { getCapCustomPaths } from '@sap-ux/project-access';
import type { Package } from '@sap-ux/project-access';

const minCdsVersion = '6.8.2';
const minCdsPluginUi5Version = '0.1.1';

/**
 * Ensure a minimum version of @sap/cds in dependencies.
 *
 * @param packageJson - the parsed package.json
 * @param [useRange] - optional: use ranges in min @sap/cds version check
 */
export function ensureMinCdsVersion(packageJson: Package, useRange?: boolean): void {
    if (!hasMinCdsVersion(packageJson, useRange)) {
        packageJson.dependencies ??= {};
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
    if (workspaceEnabled) {
        return;
    }
    let workspacePackages = getWorkspacePackages(packageJson);
    if (!workspacePackages) {
        packageJson.workspaces ??= [];
        if (Array.isArray(packageJson.workspaces)) {
            workspacePackages = packageJson.workspaces;
        } else {
            packageJson.workspaces.packages = [];
            workspacePackages = packageJson.workspaces.packages;
        }
    }
    workspacePackages.push(appWorkspace);
}

/**
 * Add devDependency to cds-plugin-ui5.
 *
 * @param packageJson - the parsed package.json
 */
export function addCdsPluginUi5(packageJson: Package): void {
    if (!hasCdsPluginUi5(packageJson)) {
        packageJson.devDependencies ??= {};
        packageJson.devDependencies['cds-plugin-ui5'] = `^${minCdsPluginUi5Version}`;
    }
}

/**
 * Check if package.json has dependency to the minimum min version of @sap/cds,
 * that is required to enable cds-plugin-ui.
 *
 * @param packageJson - the parsed package.json
 * @param useRange - boolean to allow a semver range to be used in check, if false version will be coerced to an absolute version. Initialised to false.
 * @returns - true: min cds version is present; false: cds version needs update
 */
export function hasMinCdsVersion(packageJson: Package, useRange = false): boolean {
    const packageCdsVersion = packageJson.dependencies?.['@sap/cds'];
    return (
        (useRange && satisfies(minCdsVersion, packageCdsVersion ?? '0.0.0')) ||
        gte(coerce(packageCdsVersion) ?? '0.0.0', minCdsVersion)
    );
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
    const workspacePackages = getWorkspacePackages(packageJson) ?? [];
    const workspaceEnabled = workspacePackages.includes(appWorkspace);
    return { appWorkspace, workspaceEnabled };
}

/**
 * Return the reference to the array of workspace packages or undefined if not defined.
 * The workspace packages can either be defined directly as workspaces in package.json
 * or in workspaces.packages, e.g. in yarn workspaces.
 *
 * @param packageJson - the parsed package.json
 * @returns ref to the packages in workspaces or undefined
 */
function getWorkspacePackages(packageJson: Package): string[] | undefined {
    let workspacePackages: string[] | undefined;
    if (Array.isArray(packageJson.workspaces)) {
        workspacePackages = packageJson.workspaces;
    } else if (Array.isArray(packageJson.workspaces?.packages)) {
        workspacePackages = packageJson.workspaces?.packages;
    }
    return workspacePackages;
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
