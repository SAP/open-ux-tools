import {
    type Package,
    getWorkspaceInfo,
    MinCdsPluginUi5Version,
    MinCdsVersion,
    hasMinCdsVersion,
    hasDependency
} from '@sap-ux/project-access';

/**
 * Ensure a minimum version of @sap/cds in dependencies.
 *
 * @param packageJson - the parsed package.json
 */
export function ensureMinCdsVersion(packageJson: Package): void {
    if (!hasMinCdsVersion(packageJson)) {
        packageJson.dependencies ??= {};
        packageJson.dependencies['@sap/cds'] = `^${MinCdsVersion}`;
    }
}

/**
 * Enable workspaces for app/* folders.
 *
 * @param basePath - root path of the CAP project, where package.json is located
 * @param packageJson - the parsed package.json
 */
export async function enableWorkspaces(basePath: string, packageJson: Package): Promise<void> {
    let { appWorkspace, workspaceEnabled, workspacePackages } = await getWorkspaceInfo(basePath, packageJson);
    if (workspaceEnabled) {
        return;
    }
    if (workspacePackages.length === 0) {
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
    if (!hasDependency(packageJson, 'cds-plugin-ui5')) {
        packageJson.devDependencies ??= {};
        packageJson.devDependencies['cds-plugin-ui5'] = `^${MinCdsPluginUi5Version}`;
    }
}
