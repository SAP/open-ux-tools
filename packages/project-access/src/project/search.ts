import { basename, dirname, join, parse, sep } from 'path';
import type {
    AllAdaptationResults,
    AllAppResults,
    AllExtensionResults,
    AllLibraryResults,
    FioriArtifactTypes,
    FoundFioriArtifacts,
    Manifest,
    Package,
    WorkspaceFolder
} from '../types';
import { FileName } from '../constants';
import { fileExists, findBy, findFileUp, readJSON } from '../file';
import { hasDependency } from './dependencies';
import { getCapProjectType, isCapJavaProject, isCapNodeJsProject } from './cap';
import { getWebappPath } from './ui5-config';

/**
 * Map artifact to file that is specific to the artifact type. Some artifacts can
 * be identified by the same file, like app and library have file 'manifest.json'.
 * Further filtering for specific artifact types happens in the filter{Artifact}
 * functions.
 */
const filterFileMap: Record<FioriArtifactTypes, string> = {
    applications: FileName.Manifest,
    adaptations: FileName.AdaptationConfig,
    extensions: FileName.ExtConfigJson,
    libraries: FileName.Manifest
};

/**
 * Type that is used locally only to keep list of found files with cache of the
 * content in order to avoid multiple file reads.
 */
type FileMapAndCache = { [path: string]: null | string | object };

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
 * Convert workspace root folders to root paths.
 *
 * @param wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @returns - root paths
 */
function wsFoldersToRootPaths(wsFolders: WorkspaceFolder[] | string[] | undefined): string[] {
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
    return wsRoots;
}

/**
 * Find root folder of the project containing the given file.
 *
 * @param path path of a project file
 * @param sapuxRequired if true, only find sapux projects
 * @param silent if true, then does not throw an error but returns an empty path
 */
export async function findProjectRoot(path: string, sapuxRequired = true, silent = false): Promise<string> {
    const packageJson = await findFileUp(FileName.Package, path);
    if (!packageJson) {
        if (silent) {
            return '';
        }
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
            root = await findProjectRoot(dirname(root), sapuxRequired, silent);
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
 * This is a convenient function to retrieve all apps. Same result can be achieved with call
 * findFioriArtifacts({ wsFolders, artifacts: ['applications'] }); from same module.
 *
 * @param wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @returns - results as path to apps plus files already parsed, e.g. manifest.json
 */
export async function findAllApps(wsFolders: WorkspaceFolder[] | string[] | undefined): Promise<AllAppResults[]> {
    const findResults = await findFioriArtifacts({ wsFolders, artifacts: ['applications'] });
    return findResults.applications ?? [];
}

/**
 * Filter Fiori apps from a list of files.
 *
 * @param pathMap - map of files. Key is the path, on first read parsed content will be set as value to prevent multiple reads of a file.
 * @returns - results as path to apps plus files already parsed, e.g. manifest.json
 */
async function filterApplications(pathMap: FileMapAndCache): Promise<AllAppResults[]> {
    const result: AllAppResults[] = [];
    const manifestPaths = Object.keys(pathMap).filter((path) => basename(path) === FileName.Manifest);
    for (const manifestPath of manifestPaths) {
        try {
            // All UI5 apps have at least sap.app: { id: <ID>, type: "application" } in manifest.json
            if (pathMap[manifestPath] === null) {
                pathMap[manifestPath] = await readJSON<Manifest>(manifestPath);
            }
            const manifest = pathMap[manifestPath] as Manifest;
            if (!manifest['sap.app'] || !manifest['sap.app'].id || manifest['sap.app'].type !== 'application') {
                continue;
            }
            const roots = await findRootsForPath(manifestPath);
            if (roots && !(await fileExists(join(roots.appRoot, '.adp', FileName.AdaptationConfig)))) {
                result.push({ appRoot: roots.appRoot, projectRoot: roots.projectRoot, manifest, manifestPath });
            }
        } catch {
            // ignore exceptions for invalid manifests
        }
    }
    return result;
}

/**
 * Filter adaptation projects from a list of files.
 *
 * @param pathMap - map of files. Key is the path, on first read parsed content will be set as value to prevent multiple reads of a file.
 * @returns - results as array of found adaptation projects.
 */
async function filterAdaptations(pathMap: FileMapAndCache): Promise<AllAdaptationResults[]> {
    const results: AllAdaptationResults[] = [];
    const adaptationConfigs = Object.keys(pathMap).filter((path) =>
        path.endsWith(join('/.adp', FileName.AdaptationConfig))
    );
    for (const adaptationConfig of adaptationConfigs) {
        results.push({ appRoot: dirname(dirname(adaptationConfig)) });
    }
    return results;
}

/**
 * Filter extensions projects from a list of files.
 *
 * @param pathMap - map of files. Key is the path, on first read parsed content will be set as value to prevent multiple reads of a file.
 * @returns - results as array of found extension projects.
 */
async function filterExtensions(pathMap: FileMapAndCache): Promise<AllExtensionResults[]> {
    const results: AllExtensionResults[] = [];
    const extensionConfigs = Object.keys(pathMap).filter((path) => basename(path) === FileName.ExtConfigJson);
    for (const extensionConfig of extensionConfigs) {
        results.push({ appRoot: dirname(extensionConfig) });
    }
    return results;
}

/**
 * Filter extensions projects from a list of files.
 *
 * @param pathMap - path to files
 * @returns - results as array of found library projects.
 */
async function filterLibraries(pathMap: FileMapAndCache): Promise<AllLibraryResults[]> {
    const results: AllLibraryResults[] = [];
    const manifestPaths = Object.keys(pathMap).filter((path) => basename(path) === FileName.Manifest);
    for (const manifestPath of manifestPaths) {
        try {
            if (pathMap[manifestPath] === null) {
                pathMap[manifestPath] = await readJSON<Manifest>(manifestPath);
            }
            const manifest = pathMap[manifestPath] as Manifest;
            if (manifest['sap.app'] && manifest['sap.app'].type === 'library') {
                results.push({ manifestPath: dirname(manifestPath), manifest });
            }
        } catch {
            // ignore exceptions for invalid manifests
        }
    }
    return results;
}

/**
 * Get the files to search for according to requested artifact type.
 *
 * @param artifacts - requests artifacts like apps, adaptations, extensions
 * @returns - array of filenames to search for
 */
function getFilterFileNames(artifacts: FioriArtifactTypes[]): string[] {
    const uniqueFilterFiles = new Set<string>();
    for (const artifact of artifacts) {
        if (filterFileMap[artifact]) {
            uniqueFilterFiles.add(filterFileMap[artifact]);
        }
    }
    return Array.from(uniqueFilterFiles);
}
/**
 * Find all requested Fiori artifacts like apps, adaptations, extensions, that are supported by Fiori tools, for a given list of roots (workspace folders).
 *
 * @param options - find options
 * @param options.wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @param options.artifacts - list of artifacts to search for: 'application', 'adaptation', 'extension' see FioriArtifactTypes
 * @returns - data structure containing the search results, for app e.g. as path to app plus files already parsed, e.g. manifest.json
 */
export async function findFioriArtifacts(options: {
    wsFolders?: WorkspaceFolder[] | string[];
    artifacts: FioriArtifactTypes[];
}): Promise<FoundFioriArtifacts> {
    const results: FoundFioriArtifacts = {};
    const fileNames: string[] = getFilterFileNames(options.artifacts);
    const wsRoots = wsFoldersToRootPaths(options.wsFolders);
    const pathMap: FileMapAndCache = {};
    for (const root of wsRoots) {
        try {
            const foundFiles = await findBy({
                fileNames,
                root,
                excludeFolders: ['.git', 'node_modules', 'dist']
            });
            foundFiles.forEach((path) => (pathMap[path] = null));
        } catch {
            // ignore exceptions during find
        }
    }
    if (options.artifacts.includes('applications')) {
        results.applications = await filterApplications(pathMap);
    }
    if (options.artifacts.includes('adaptations')) {
        results.adaptations = await filterAdaptations(pathMap);
    }
    if (options.artifacts.includes('extensions')) {
        results.extensions = await filterExtensions(pathMap);
    }
    if (options.artifacts.includes('libraries')) {
        results.libraries = await filterLibraries(pathMap);
    }
    return results;
}
