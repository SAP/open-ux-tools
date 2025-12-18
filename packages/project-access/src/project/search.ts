import { basename, dirname, isAbsolute, join, parse, sep } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type {
    AdaptationResults,
    AllAppResults,
    CapProjectType,
    ComponentResults,
    ExtensionResults,
    FioriArtifactTypes,
    FoundFioriArtifacts,
    LibraryResults,
    Manifest,
    Package,
    WorkspaceFolder
} from '../types';
import { FileName } from '../constants';
import { fileExists, findBy, findFileUp, readJSON } from '../file';
import { hasDependency } from './dependencies';
import { getCapProjectType } from './cap';
import { getWebappPath } from './ui5-config';

/**
 * Map artifact to file that is specific to the artifact type. Some artifacts can
 * be identified by the same file, like app and library have file 'manifest.json'.
 * Further filtering for specific artifact types happens in the filter{Artifact}
 * functions.
 */
const filterFileMap: Record<FioriArtifactTypes, string[]> = {
    applications: [FileName.Manifest],
    adaptations: [FileName.ManifestAppDescrVar],
    components: [FileName.Manifest],
    extensions: [FileName.ExtConfigJson],
    libraries: [FileName.Library, FileName.Manifest]
};

/**
 * Type that is used locally only to keep list of found files with cache of the
 * content in order to avoid multiple file reads. It also caches result of call
 * getCapProjectType() this is expensive.
 */
type FileMapAndCache = {
    files: { [path: string]: null | string | object };
    capProjectType: Map<string, CapProjectType | undefined>;
};

/**
 * Default folders to exclude from search.
 */
const excludeFolders = ['.git', 'node_modules', 'dist'];
/**
 * WorkspaceFolder type guard.
 *
 * @param value - value to type check
 * @returns - true: is a vscode workspace array; no: not a vscode workspace array
 */
function isWorkspaceFolder(value: readonly WorkspaceFolder[] | string[]): value is WorkspaceFolder[] {
    return value && (value as WorkspaceFolder[]).length > 0 && (value as WorkspaceFolder[])[0].uri !== undefined;
}

/**
 * Convert workspace root folders to root paths.
 *
 * @param wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @returns - root paths
 */
function wsFoldersToRootPaths(wsFolders: readonly WorkspaceFolder[] | string[] | undefined): string[] {
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
        wsRoots = (wsFolders ?? []) as string[];
    }
    return wsRoots;
}

/**
 * Find root folder of the project containing the given file.
 *
 * @param path path of a project file
 * @param sapuxRequired if true, only find sapux projects
 * @param silent if true, then does not throw an error but returns an empty path
 * @param memFs - optional mem-fs-editor instance
 * @returns {*}  {Promise<string>} - Project Root
 */
export async function findProjectRoot(
    path: string,
    sapuxRequired = true,
    silent = false,
    memFs?: Editor
): Promise<string> {
    const packageJson = await findFileUp(FileName.Package, path, memFs);
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
        const sapux = (await readJSON<Package>(packageJson, memFs)).sapux;
        if (!sapux) {
            root = await findProjectRoot(dirname(root), sapuxRequired, silent, memFs);
        }
    }
    return root;
}

/**
 * Find app root and project root from given paths and sapux entry.
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
 * Type guard for Editor or Editor and FileMapAndCache.
 *
 * @param argument - argument to check
 * @returns true if argument is Editor, false if it is FileMapAndCache
 */
function isEditor(argument: Editor | { memFs?: Editor; cache?: FileMapAndCache }): argument is Editor {
    return (argument as Editor).commit !== undefined;
}

/**
 * Internal helper function to resolve options for findRootsForPath() and findCapProjectRoot().
 *
 * @param options - optional mem-fs-editor instance or options object with optional memFs and cache
 * @returns memFs and cache
 */
function getFindOptions(options?: Editor | { memFs?: Editor; cache?: FileMapAndCache }): {
    memFs: Editor | undefined;
    cache: FileMapAndCache;
} {
    let memFs: Editor | undefined;
    let cache: FileMapAndCache = { files: {}, capProjectType: new Map<string, CapProjectType | undefined>() };

    if (options) {
        // Check if options is Editor or { memFs?: Editor; cache?: FileMapAndCache }
        if (isEditor(options)) {
            memFs = options;
        } else {
            memFs = options.memFs;
            cache = options.cache ?? cache;
        }
    }
    return { memFs, cache };
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
 * @param options - optional mem-fs-editor instance or options object with optional memFs and cache
 * @returns - in case a supported app is found this function returns the appRoot and projectRoot path
 */
export async function findRootsForPath(
    path: string,
    options?: Editor | { memFs?: Editor; cache?: FileMapAndCache }
): Promise<{ appRoot: string; projectRoot: string } | null> {
    try {
        const { memFs, cache } = getFindOptions(options);

        // Get the root of the app, that is where the package.json is, otherwise not supported
        const appRoot = await findProjectRoot(path, false, false, memFs);
        if (!appRoot) {
            return null;
        }
        cache.files[path] ??= await readJSON<Package>(join(appRoot, FileName.Package), memFs);
        const appPckJson = cache.files[path] as Package;
        // Check for most common app, Fiori elements with sapux=true in package.json
        if (appPckJson.sapux) {
            return findRootsWithSapux(appPckJson.sapux, path, appRoot);
        }
        // Check if app is included in CAP project
        const projectRoot = await findCapProjectRoot(appRoot, undefined, { memFs, cache });
        if (projectRoot) {
            // App included in CAP
            return {
                appRoot,
                projectRoot
            };
        } else if (
            // Check for freestyle non CAP
            (await fileExists(join(appRoot, FileName.Ui5LocalYaml), memFs)) &&
            hasDependency(appPckJson, '@sap/ux-ui5-tooling')
        ) {
            return {
                appRoot,
                projectRoot: appRoot
            };
        }
    } catch {
        // Finding root should not throw error. Return null instead.
    }
    return null;
}

/**
 * Find CAP project root path.
 *
 * @param path - path inside CAP project
 * @param checkForAppRouter - if true, checks for app router in CAP project app folder
 * @param options - optional mem-fs-editor instance or options object with optional memFs and cache
 * @returns - CAP project root path
 */
export async function findCapProjectRoot(
    path: string,
    checkForAppRouter = true,
    options?: Editor | { memFs?: Editor; cache?: FileMapAndCache }
): Promise<string | null> {
    try {
        if (!isAbsolute(path)) {
            return null;
        }
        const { memFs, cache } = getFindOptions(options);
        const { root } = parse(path);
        let projectRoot = dirname(path);
        while (projectRoot !== root) {
            if (!cache.capProjectType.has(projectRoot)) {
                cache.capProjectType.set(projectRoot, await getCapProjectType(projectRoot, memFs));
            }
            const capProjectType = cache.capProjectType.get(projectRoot);
            if (capProjectType) {
                // We have found a CAP project as root. Check if the found app is not directly in CAP's 'app/' folder.
                // Sometime there is a <CAP_ROOT>/app/package.json file that is used for app router (not an app)
                // or skip app router check if checkForAppRouter is false and return the project root.
                if ((checkForAppRouter && join(projectRoot, 'app') !== path) || !checkForAppRouter) {
                    return projectRoot;
                }
            }
            projectRoot = dirname(projectRoot);
        }
    } catch {
        // No project root can be found at parent folder.
    }
    return null;
}

/**
 * Find all app that are supported by Fiori tools for a given list of roots (workspace folders).
 * This is a convenient function to retrieve all apps. Same result can be achieved with call
 * findFioriArtifacts({ wsFolders, artifacts: ['applications'] }); from same module.
 *
 * @param wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as path to apps plus files already parsed, e.g. manifest.json
 */
export async function findAllApps(
    wsFolders: readonly WorkspaceFolder[] | string[] | undefined,
    memFs?: Editor
): Promise<AllAppResults[]> {
    const findResults = await findFioriArtifacts({ wsFolders, artifacts: ['applications'], memFs });
    return findResults.applications ?? [];
}

/**
 * Filter Fiori apps from a list of files.
 *
 * @param pathMap - map of files. Key is the path, on first read parsed content will be set as value to prevent multiple reads of a file.
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as path to apps plus files already parsed, e.g. manifest.json
 */
async function filterApplications(pathMap: FileMapAndCache, memFs?: Editor): Promise<AllAppResults[]> {
    const result: AllAppResults[] = [];
    const manifestPaths = Object.keys(pathMap.files).filter((path) => basename(path) === FileName.Manifest);
    for (const manifestPath of manifestPaths) {
        try {
            // All UI5 apps have at least sap.app: { id: <ID>, type: "application" } in manifest.json
            pathMap.files[manifestPath] ??= await readJSON<Manifest>(manifestPath, memFs);
            const manifest = pathMap.files[manifestPath] as Manifest;
            if (!manifest['sap.app']?.id || manifest['sap.app'].type !== 'application') {
                continue;
            }
            const roots = await findRootsForPath(dirname(manifestPath), { memFs, cache: pathMap });
            if (roots && !(await fileExists(join(roots.appRoot, '.adp', FileName.AdaptationConfig), memFs))) {
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
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as array of found adaptation projects.
 */
async function filterAdaptations(pathMap: FileMapAndCache, memFs?: Editor): Promise<AdaptationResults[]> {
    const results: AdaptationResults[] = [];
    const manifestAppDescrVars = Object.keys(pathMap.files).filter((path) =>
        path.endsWith(FileName.ManifestAppDescrVar)
    );
    for (const manifestAppDescrVar of manifestAppDescrVars) {
        const packageJsonPath = await findFileUp(FileName.Package, dirname(manifestAppDescrVar), memFs);
        const projectRoot = packageJsonPath ? dirname(packageJsonPath) : null;
        const webappPath = await getWebappPath(projectRoot ?? '', memFs);
        if (projectRoot && (await fileExists(join(webappPath, FileName.ManifestAppDescrVar), memFs))) {
            results.push({ appRoot: projectRoot, manifestAppdescrVariantPath: manifestAppDescrVar });
        }
    }
    return results;
}

/**
 * Filter extensions projects from a list of files.
 *
 * @param pathMap - map of files. Key is the path, on first read parsed content will be set as value to prevent multiple reads of a file.
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as array of found extension projects.
 */
async function filterExtensions(pathMap: FileMapAndCache, memFs?: Editor): Promise<ExtensionResults[]> {
    const results: ExtensionResults[] = [];
    const extensionConfigs = Object.keys(pathMap.files).filter((path) => basename(path) === FileName.ExtConfigJson);
    for (const extensionConfig of extensionConfigs) {
        try {
            let manifest: Manifest | null = null;
            let manifestPath = Object.keys(pathMap).find(
                (path) => path.startsWith(dirname(extensionConfig) + sep) && basename(path) === FileName.Manifest
            );
            if (manifestPath) {
                pathMap.files[manifestPath] ??= await readJSON<Manifest>(manifestPath, memFs);
                manifest = pathMap.files[manifestPath] as Manifest;
            } else {
                const manifests = await findBy({
                    fileNames: [FileName.Manifest],
                    root: dirname(extensionConfig),
                    excludeFolders,
                    memFs
                });
                if (manifests.length === 1) {
                    [manifestPath] = manifests;
                    manifest = await readJSON<Manifest>(manifestPath, memFs);
                }
            }
            if (manifestPath && manifest) {
                results.push({ appRoot: dirname(extensionConfig), manifest, manifestPath });
            }
        } catch {
            // ignore exceptions for invalid manifests
        }
    }
    return results;
}

/**
 * Find and filter libraries with only a `.library` and no `manifest.json`.
 *
 * @param pathMap - path to files
 * @param manifestPaths - paths to manifest.json files
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as array of found .library projects.
 */
async function filterDotLibraries(
    pathMap: FileMapAndCache,
    manifestPaths: string[],
    memFs?: Editor
): Promise<LibraryResults[]> {
    const dotLibraries: LibraryResults[] = [];
    const dotLibraryPaths = Object.keys(pathMap.files)
        .filter((path) => basename(path) === FileName.Library)
        .map((path) => dirname(path))
        .filter((path) => !manifestPaths.map((manifestPath) => dirname(manifestPath)).includes(path));
    if (dotLibraryPaths) {
        for (const libraryPath of dotLibraryPaths) {
            const projectRoot = dirname(
                (await findFileUp(FileName.Package, dirname(libraryPath), memFs)) ?? libraryPath
            );
            dotLibraries.push({ projectRoot, libraryPath });
        }
    }
    return dotLibraries;
}

/**
 * Filter libraries from a list of files.
 *
 * @param pathMap - path to files
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as array of found library projects.
 */
async function filterLibraries(pathMap: FileMapAndCache, memFs?: Editor): Promise<LibraryResults[]> {
    const results: LibraryResults[] = [];
    const manifestPaths = Object.keys(pathMap.files).filter((path) => basename(path) === FileName.Manifest);
    results.push(...(await filterDotLibraries(pathMap, manifestPaths, memFs)));
    for (const manifestPath of manifestPaths) {
        try {
            pathMap.files[manifestPath] ??= await readJSON<Manifest>(manifestPath, memFs);
            const manifest = pathMap.files[manifestPath] as Manifest;
            if (manifest['sap.app']?.type === 'library') {
                const packageJsonPath = await findFileUp(FileName.Package, dirname(manifestPath), memFs);
                const projectRoot = packageJsonPath ? dirname(packageJsonPath) : null;
                if (projectRoot && (await fileExists(join(projectRoot, FileName.Ui5Yaml), memFs))) {
                    results.push({ projectRoot, manifestPath, manifest });
                }
            }
        } catch {
            // ignore exceptions for invalid manifests
        }
    }
    return results;
}

/**
 * Filter components from a list of files.
 *
 * @param pathMap - path to files
 * @param memFs - optional mem-fs-editor instance
 * @returns - results as array of found components.
 */
async function filterComponents(pathMap: FileMapAndCache, memFs?: Editor): Promise<ComponentResults[]> {
    const results: ComponentResults[] = [];
    const manifestPaths = Object.keys(pathMap.files).filter((path) => basename(path) === FileName.Manifest);
    for (const manifestPath of manifestPaths) {
        try {
            pathMap.files[manifestPath] ??= await readJSON<Manifest>(manifestPath, memFs);
            const manifest = pathMap.files[manifestPath] as Manifest;
            if (manifest['sap.app']?.type === 'component') {
                const packageJsonPath = await findFileUp(FileName.Package, dirname(manifestPath), memFs);
                const projectRoot = packageJsonPath ? dirname(packageJsonPath) : null;
                if (projectRoot) {
                    results.push({ projectRoot, manifestPath, manifest });
                }
            }
        } catch {
            // ignore exceptions for invalid components
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
            filterFileMap[artifact].forEach((artifactFile) => uniqueFilterFiles.add(artifactFile));
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
 * @param options.memFs - optional mem-fs-editor instance
 * @returns - data structure containing the search results, for app e.g. as path to app plus files already parsed, e.g. manifest.json
 */
export async function findFioriArtifacts(options: {
    wsFolders?: readonly WorkspaceFolder[] | string[];
    artifacts: FioriArtifactTypes[];
    memFs?: Editor;
}): Promise<FoundFioriArtifacts> {
    const results: FoundFioriArtifacts = {};
    const fileNames: string[] = getFilterFileNames(options.artifacts);
    const wsRoots = wsFoldersToRootPaths(options.wsFolders);
    const pathMap: FileMapAndCache = { files: {}, capProjectType: new Map<string, CapProjectType | undefined>() };
    for (const root of wsRoots) {
        try {
            const foundFiles = await findBy({
                fileNames,
                root,
                excludeFolders,
                memFs: options.memFs
            });
            foundFiles.forEach((path) => (pathMap.files[path] = null));
        } catch {
            // ignore exceptions during find
        }
    }
    if (options.artifacts.includes('applications')) {
        results.applications = await filterApplications(pathMap, options.memFs);
    }
    if (options.artifacts.includes('adaptations')) {
        results.adaptations = await filterAdaptations(pathMap, options.memFs);
    }
    if (options.artifacts.includes('extensions')) {
        results.extensions = await filterExtensions(pathMap, options.memFs);
    }
    if (options.artifacts.includes('libraries')) {
        results.libraries = await filterLibraries(pathMap, options.memFs);
    }
    if (options.artifacts.includes('components')) {
        results.components = await filterComponents(pathMap, options.memFs);
    }
    return results;
}

/**
 * Find all CAP project roots by locating pom.xml or package.json in a given workspace.
 *
 * @param options - find options
 * @param options.wsFolders - list of roots, either as vscode WorkspaceFolder[] or array of paths
 * @returns - root file paths that may contain a CAP project
 */
export async function findCapProjects(options: {
    readonly wsFolders: WorkspaceFolder[] | string[];
}): Promise<string[]> {
    const result = new Set<string>();
    const excludeFolders = ['node_modules', 'dist', 'webapp', 'MDKModule', 'gen'];
    const fileNames = [FileName.Pom, FileName.Package, FileName.CapJavaApplicationYaml];
    const wsRoots = wsFoldersToRootPaths(options.wsFolders);
    for (const root of wsRoots) {
        const filesToCheck = await findBy({
            fileNames,
            root,
            excludeFolders
        });
        const appYamlsToCheck = Array.from(
            new Set(
                filesToCheck
                    .filter((file) => basename(file) === FileName.CapJavaApplicationYaml)
                    .map((file) => dirname(file))
            )
        );
        const foldersToCheck = Array.from(
            new Set(
                filesToCheck
                    .filter((file) => basename(file) !== FileName.CapJavaApplicationYaml)
                    .map((file) => dirname(file))
            )
        );
        for (const appYamlToCheck of appYamlsToCheck) {
            const capRoot = await findCapProjectRoot(appYamlToCheck);
            if (capRoot) {
                result.add(capRoot);
            }
        }
        for (const folderToCheck of foldersToCheck) {
            if ((await getCapProjectType(folderToCheck)) !== undefined) {
                result.add(folderToCheck);
            }
        }
    }
    return Array.from(result);
}
