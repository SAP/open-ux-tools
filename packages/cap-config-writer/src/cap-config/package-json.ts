import {
    type Package,
    hasCdsPluginUi5,
    getWorkspaceInfo,
    getWorkspacePackages,
    minCdsVersion,
    hasMinCdsVersion
} from '@sap-ux/project-access';

const minCdsPluginUi5Version = '0.9.3';

/**
 * Ensure a minimum version of @sap/cds in dependencies.
 *
 * @param packageJson - the parsed package.json
 */
export function ensureMinCdsVersion(packageJson: Package): void {
    if (!hasMinCdsVersion(packageJson)) {
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
