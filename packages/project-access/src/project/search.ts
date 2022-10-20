import { dirname, join, parse, sep } from 'path';
import type { AllAppResults, Manifest, Package, WorkspaceFolder } from '../types';
import { FileName } from '../constants';
import { fileExists, findFiles, findFileUp, readJSON } from '../file';
import { hasDependency } from './dependencies';
import { getCapProjectType, isCapJavaProject, isCapNodeJsProject } from './cap';
import { getWebappPath } from './ui5-config';

/**
 * WorkspaceFolder type guard.
 *
 * @param value - value to type check
 * @returns - true: is a vscode workspace array; no: not a vscode workspace array
 */
function isWorkspaceFolder(value: WorkspaceFolder[] | string[]): value is WorkspaceFolder[] {
    return value && (value as WorkspaceFolder[]).length > 0 && (value as WorkspaceFolder[])[0].uri !== undefined;
}

/**
 * Search all manifest.json files in given workspaces. This is used as starting point to find all tools
 * supported apps.
 *
 * @param wsFolders - workspace folders
 * @returns - array of path to manifest.json files
 */
async function findAllManifest(wsFolders: WorkspaceFolder[] | string[] | undefined): Promise<string[]> {
    // extract root path if provided as VSCode folder
    let wsRoots: string[];
    if (wsFolders && isWorkspaceFolder(wsFolders)) {
        wsRoots = [];
        wsFolders
            .filter((each) => each.uri.scheme === 'file')
            .forEach((folder) => {
                wsRoots.push(folder.uri.fsPath);
            });
    } else {
        wsRoots = wsFolders || [];
    }
    // find all manifest files
    const manifests: string[] = [];
    for (const root of wsRoots) {
        try {
            manifests.push(...(await findFiles(FileName.Manifest, root, ['.git', 'node_modules', 'dist'])));
        } catch {
            // ignore exceptions during find
        }
    }
    return manifests;
}

/**
 * Find root folder of the project containing the given file.
 *
 * @param path path of a project file
 * @param sapuxRequired if true, only find sapux projects
 */
export async function findProjectRoot(path: string, sapuxRequired = true): Promise<string> {
    const packageJson = await findFileUp(FileName.Package, path);
    if (!packageJson) {
        throw new Error(
            `Could not find any project root for '${path}'. Search was done for ${
                sapuxRequired ? 'Fiori elements' : 'All'
            } projects.`
        );
    }
    let root = dirname(packageJson);
    if (sapuxRequired) {
        const sapux = (await readJSON<Package>(packageJson)).sapux;
        if (!sapux) {
            root = await findProjectRoot(dirname(root), sapuxRequired);
        }
    }
    return root;
}

/**
 * Find app root and project root from given paths and sapux entry.
 *
 *
 * @param sapux - value of sapux in package.json, either boolean or string array
 * @param path - path where the search started from
 * @param root - root of the app or project, where package.json is located
 * @returns - appRoot and projectRoot or null
 */
function findRootsWithSapux(
    sapux: boolean | string[],
    path: string,
    root: string
): { appRoot: string; projectRoot: string } | null {
    if (typeof sapux === 'boolean' && sapux === true) {
        return {
            appRoot: root,
            projectRoot: root
        };
    } else if (Array.isArray(sapux)) {
        // Backward compatibility for FE apps in CAP projects that have no app package.json,
        // but are listed in CAP root sapux array
        const pathWithSep = path.endsWith(sep) ? path : path + sep;
        const relAppPaths = sapux.map((a) => join(...a.split(/[\\/]/)));
        const relApp = relAppPaths.find((app) => pathWithSep.startsWith(join(root, app) + sep));
        if (relApp) {
            return {
                appRoot: join(root, relApp),
                projectRoot: root
            };
        }
    }
    // The first package.json we found when searching up contains sapux, but not true -> not supported
    return null;
}

/**
 * Get the application root for a given webapp path.
 *
 * @param webappPath - path to webapp folder, where manifest.json is
 * @returns - root path of the application, where usually ui5.yaml and package.json are
 */
export async function getAppRootFromWebappPath(webappPath: string): Promise<string | null> {
    const ui5YamlPath = await findFileUp(FileName.Ui5Yaml, webappPath);
    let appRoot = dirname(webappPath);
    if (ui5YamlPath) {
        const candidate = dirname(ui5YamlPath);
        const webapp = await getWebappPath(candidate);
        if (webapp === webappPath) {
            appRoot = candidate;
        }
    }
    return appRoot;
}

/**
 * Find the app root and project root folder for a given path. In case of apps in non CAP projects they are the same.
 * This function also validates if an app is supported by tools considering Fiori elements apps and SAPUI5
 * freestyle apps. Only if project root and app root can be determined, they are returned, otherwise null is returned.
 * This function is used e.g. to get a filtered list of all manifest.json files in a workspace for tools
 * supported apps and retrieve the respective root paths.
 *
 * This function makes following assumptions:
 * - All applications have a package.json in root folder.
 * - If sapux=true in package.json the app is NOT inside a CAP project.
 * - Freestyle application (non CAP) has in package.json dependency to @sap/ux-ui5-tooling and <appRoot>/ui5-local.yaml.
 *
 * @param path - path to check, e.g. to the manifest.json
 * @returns - in case a supported app is found this function returns the appRoot and projectRoot path
 */
async function findRootsForPath(path: string): Promise<{ appRoot: string; projectRoot: string } | null> {
    try {
        // Get the root of the app, that is where the package.json is, otherwise not supported
        const appRoot = await findProjectRoot(path, false);
        if (!appRoot) {
            return null;
        }
        const appPckJson = await readJSON<Package>(join(appRoot, FileName.Package));
        // Check for most common app, Fiori elements with sapux=true in package.json
        if (appPckJson.sapux) {
            return findRootsWithSapux(appPckJson.sapux, path, appRoot);
        }
        if (isCapNodeJsProject(appPckJson) || (await isCapJavaProject(appRoot))) {
            // App is part of a CAP project, but doesn't have own package.json and is not mentioned in sapux array
            // in root -> not supported
            return null;
        }
        // Now we have the app root folder. Check for freestyle non CAP
        if (
            (await fileExists(join(appRoot, FileName.Ui5LocalYaml))) &&
            hasDependency(appPckJson, '@sap/ux-ui5-tooling')
        ) {
            return {
                appRoot,
                projectRoot: appRoot
            };
        }
        // Project must be CAP, find project root
        try {
            const { root } = parse(appRoot);
            let projectRoot = dirname(appRoot);
            while (projectRoot !== root) {
                if (await getCapProjectType(projectRoot)) {
                    // We have found a CAP project as root. Check if the found app is not directly in CAP's 'app/' folder.
                    // Sometime there is a <CAP_ROOT>/app/package.json file that is used for app router (not an app)
                    if (join(projectRoot, 'app') !== appRoot) {
                        return {
                            appRoot,
                            projectRoot
                        };
                    }
                }
                projectRoot = dirname(projectRoot);
            }
        } catch {
            // No project root can be found at parent folder.
        }
    } catch {
        // Finding root should not throw error. Return null instead.
    }
    return null;
}

/**
 * Find all app that are supported by Fiori tools for a given list of roots (workspace folders).
 *
 * @param wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @returns - results as path to apps plus files already parsed, e.g. manifest.json
 */
export async function findAllApps(wsFolders: WorkspaceFolder[] | string[] | undefined): Promise<AllAppResults[]> {
    const result: AllAppResults[] = [];
    const manifestPaths = await findAllManifest(wsFolders);

    for (const manifestPath of manifestPaths) {
        try {
            // All UI5 apps have at least sap.app: { id: <ID>, type: "application" } in manifest.json
            const manifest = await readJSON<Manifest>(join(manifestPath, FileName.Manifest));
            if (!manifest['sap.app'] || !manifest['sap.app'].id || manifest['sap.app'].type !== 'application') {
                continue;
            }
            const roots = await findRootsForPath(manifestPath);
            if (roots) {
                result.push({ appRoot: roots.appRoot, projectRoot: roots.projectRoot, manifest, manifestPath });
            }
        } catch {
            // ignore exceptions for invalid manifests
        }
    }
    return result;
}
