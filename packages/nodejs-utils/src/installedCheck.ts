import { isAppStudio } from '@sap-ux/btp-utils';
import { CommandRunner } from './commandRunner';
import fastGlob from 'fast-glob';
import { join } from 'path';
import readPkgUp from 'read-pkg-up';
import type { SemVer } from 'semver';
import { coerce, lt } from 'semver';
import type { WorkspaceConfiguration } from 'vscode';

export type PackageInfo = {
    /** Path to the main entry point. Can be used by composeWith. */
    path: string;
    /** Path to the package.json */
    packageJsonPath: string;
    /** The parsed package info */
    packageInfo: readPkgUp.PackageJson;
};

/**
 * Search for the closest package.json file, starting from the path specified.
 *
 * @param searchPath - the path from which to search for the package.json
 * @param minVersion - the minimum version of the specified generator that will be considered, lower versions will not be returned. Must be a valid SemVer string.
 * @returns the package info or undefined if not found
 */
const getPackageInfo = async (searchPath: string, minVersion?: string): Promise<PackageInfo | void> => {
    const pkgInfo: readPkgUp.ReadResult | undefined = await readPkgUp({ cwd: searchPath } as readPkgUp.Options);
    if (pkgInfo) {
        if (minVersion && lt(coerce(pkgInfo.packageJson.version) as SemVer | string, minVersion)) {
            return;
        } else {
            return {
                packageJsonPath: pkgInfo.path,
                packageInfo: pkgInfo.packageJson,
                path: join(searchPath, pkgInfo.packageJson.main ?? '/generators/app')
            };
        }
    }
};

/**
 * Find installed packages that contain the specified package name substring and keyword.
 *
 * @param {string} subName - the substring to be matched against package names e.g. 'fiori-gen-ext' will be matched using glob pattern '*fiori-gen-ext*'
 * @param options -
 *  @param options.keyword - keyword that will be matched against found package.json keywords property
 *  @param options.vscWorkspaceConfig - if provided alternative vscode configured install paths will be checked
 *  @param options.minVersion - the minimum version of the specified extension, lower versions will not be returned. Must be a valid SemVer string
 * @returns {*}  {Promise<PackageInfo[]>}
 */
export async function findInstalledPackages(
    subName: string,
    options?: { keyword?: string; vscWorkspaceConfig?: WorkspaceConfiguration; minVersion?: string }
): Promise<PackageInfo[]> {
    const npmInstallPaths = await getNpmInstallPaths(options?.vscWorkspaceConfig);
    const installedGenPackageInfos: PackageInfo[] = [];

    const matchedPackages = [];
    // Find all matching packages
    for await (const installPath of npmInstallPaths) {
        // Fast-glob search patterns must use forward-slashes, UNC can be used as `cwd`
        const matches = await fastGlob(`**/*${subName}*`, {
            cwd: installPath,
            deep: 2, // Depth is 2, since packages may be nested in scope folders
            onlyDirectories: true,
            absolute: true
        });
        if (matches.length > 0) {
            matchedPackages.push(...matches);
        }
    }

    // Read package.json
    for await (const packagePath of matchedPackages) {
        const genPackageInfo = await getPackageInfo(packagePath, options?.minVersion);
        // Module naming pattern + keyword indicates Fiori gen extension
        if (
            genPackageInfo &&
            (!options?.keyword || (options.keyword && genPackageInfo.packageInfo.keywords?.includes(options.keyword)))
        ) {
            installedGenPackageInfos.push(genPackageInfo);
        }
    }

    return installedGenPackageInfos;
}

/**
 * Returns all possible node modules install paths. On BAS this can be various locations.
 * On VSCode this can be a custom location. NPM global root is always included.
 *
 * @param vscWorkspaceConfig - alternative install locations may be set in workspace config
 * @returns - npm node module paths where packages may be installed
 */
async function getNpmInstallPaths(vscWorkspaceConfig?: WorkspaceConfiguration): Promise<string[]> {
    const genSearchPaths = [];

    // VSC custom install path
    if (vscWorkspaceConfig) {
        const appWizardInstallLocation = 'ApplicationWizard.installationLocation';
        // App Wizard allows custom generator path install locations to be user configured
        const customGenInstallLoc = vscWorkspaceConfig?.get(appWizardInstallLocation);
        if (customGenInstallLoc) {
            genSearchPaths.push(join(customGenInstallLoc as string, 'node_modules'));
        }
    }

    // Npm global node modules path
    const runner = new CommandRunner();
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const rootNodeModules = await runner
        .run(npm, ['-g', 'root'])
        .then((res) => {
            return res as string;
        })
        .catch(() => {
            return undefined;
        });

    if (rootNodeModules) {
        genSearchPaths.push(join(rootNodeModules.trim()));
    }

    // BAS recommend using NODE_PATH as the paths therein are used to locate all generators regardless of installation method
    if (isAppStudio() && process.env.NODE_PATH) {
        genSearchPaths.push(...process.env.NODE_PATH.split(':').filter((path) => path.endsWith('node_modules')));
    }

    return genSearchPaths;
}
