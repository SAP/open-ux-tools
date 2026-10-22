import { dirname, join, relative, sep } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { createMemFsEditor } from './fs-adapter.js';
import { getReuseLibs, findAllProjectRoots, ReuseLibType } from './file-discovery.js';
import type { Manifest, Package } from '../project-spec-types.js';
import { DirName } from '../project-spec-types.js';
import { legacyPath, findAllWebIDEProjectFolders, findProjectsByManifest } from './common.js';
import type { ImportProjectInfo, Message, MigratableFolder, ProjectFolder } from '../types.js';
import { ODataVersion } from '../types.js';
import { MigrationTypes } from './constants.js';
import { URI } from 'vscode-uri';
import { processProjectExtension } from '../project/project-extension.js';
import { processAdaptationProject } from '../project/adaptation-project.js';
import { processRegularProject } from '../project/regular-project.js';
import { processReuseLibrary } from '../project/reuse-library.js';
import { i18nText } from '../i18n.js';
// Import extracted readers and utilities
import {
    getWebappPath,
    getManifestJson,
    getManifestPath,
    getPackageJson,
    getPackageJsonPath,
    getVersionFromManifest,
    getSemanticObjectAction,
    getFlpIntentFromHtml,
    getFloorPlan,
    getMainEntity,
    getFirstBackend,
    checkMigratableAdaptationProject,
    isFioriToolsAdaptationProject,
    readProjectExtensionSettings,
    checkIfProjectExtension,
    getExtensionProjectModuleName,
    checkIfReuseLib,
    findNestedReuseLibManifest,
    getReuseLibModuleName,
    getClientFromDestinationName,
    getNeoAppData,
    getDestinationFromNeoApp,
    isSamePath
} from './project-readers/index.js';

/**
 * Try to load manifest from standard or legacy paths
 *
 * @param fs - mem-fs editor
 * @param projectRoot - Project root path
 * @param webappPath - Webapp path
 * @returns Manifest and updated webapp path, or undefined if not found
 */
async function tryLoadManifest(
    fs: Editor,
    projectRoot: string,
    webappPath: string
): Promise<{ manifest: Manifest; updatedWebappPath: string } | undefined> {
    // Try standard location first
    try {
        const manifest = await getManifestJson(fs, projectRoot, webappPath);
        return { manifest, updatedWebappPath: webappPath };
    } catch {
        // Expected: manifest.json may not exist in standard location
    }

    // Try legacy path
    try {
        const manifest = await getManifestJson(fs, join(projectRoot, legacyPath), webappPath);
        return { manifest, updatedWebappPath: join(legacyPath, webappPath) };
    } catch {
        // Expected: manifest.json not found in either path
    }

    return undefined;
}

/**
 * Try to find manifest in nested reuse lib structure
 *
 * @param fs - mem-fs editor
 * @param projectRoot - Project root path
 * @returns Manifest and webapp path if found
 */
async function tryFindNestedLibManifest(
    fs: Editor,
    projectRoot: string
): Promise<{ manifest: Manifest; webappPath: string } | undefined> {
    const nestedLib = await findNestedReuseLibManifest(fs, projectRoot);
    if (nestedLib) {
        return {
            manifest: nestedLib.manifest,
            webappPath: relative(projectRoot, dirname(nestedLib.manifestPath))
        };
    }
    return undefined;
}

/**
 * Handle manifest resolution when no manifest was found in standard locations
 *
 * @param fs - mem-fs editor
 * @param projectRoot - Project root path
 * @param migrationType - Migration type
 * @param isProjectExtension - Whether project is an extension
 * @param checkMigratableAdaptationProject - Function to check adaptation project
 * @param checkIfReuseLib - Function to check if reuse library
 * @returns Resolution result with manifest, webappPath, isReuseLib flag, and messages
 */
async function resolveManifestForUnknownProject(
    fs: Editor,
    projectRoot: string,
    migrationType: MigrationTypes | undefined,
    isProjectExtension: boolean,
    checkMigratableAdaptationProject: (root: string) => Promise<any>,
    checkIfReuseLib: (root: string, type?: MigrationTypes) => Promise<boolean>
): Promise<{
    manifest?: Manifest;
    webappPath?: string;
    isReuseLib: boolean;
    messages: Message[];
}> {
    const messages: Message[] = [];
    let isReuseLib = await checkIfReuseLib(projectRoot, migrationType);
    let manifest: Manifest | undefined;
    let webappPath: string | undefined;

    if (!isReuseLib && !isProjectExtension) {
        const nestedLib = await tryFindNestedLibManifest(fs, projectRoot);
        if (nestedLib) {
            manifest = nestedLib.manifest;
            webappPath = nestedLib.webappPath;
            isReuseLib = true;
        }
    }

    // Only report error if not a known project type without manifest
    if (!isReuseLib && !isProjectExtension) {
        const adaptationCheck = await checkMigratableAdaptationProject(projectRoot);
        if (adaptationCheck === undefined) {
            messages.push({ type: 'ERROR', description: i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION') });
        }
    }

    return { manifest, webappPath, isReuseLib, messages };
}

/**
 * Determine project type and return appropriate flags
 *
 * @param isReuseLib - Whether project is a reuse library
 * @param isProjectExtension - Whether project is a project extension
 * @param isAdaptationProject - Whether project is an adaptation project
 * @param manifest - Project manifest
 * @returns Project type identifier
 */
type ProjectType = 'regular' | 'reuseLib' | 'extension' | 'adaptation';

function determineProjectType(
    isReuseLib: boolean,
    isProjectExtension: boolean,
    isAdaptationProject: boolean,
    manifest?: Manifest
): ProjectType {
    if (manifest && !isReuseLib && !isProjectExtension && !isAdaptationProject) {
        return 'regular';
    }
    if (isReuseLib && !isProjectExtension) {
        return 'reuseLib';
    }
    if (isProjectExtension) {
        return 'extension';
    }
    return 'adaptation';
}

const defaultProjectInfo: ImportProjectInfo = {
    moduleName: '',
    moduleDescription: '',
    sapux: false,
    rootPath: '',
    floorPlan: undefined,
    mainServiceURI: '',
    mainServiceFsPath: '',
    mainService: '',
    odataVersion: ODataVersion.v2,
    mainEntity: '',
    namespace: '',
    ui5Theme: '',
    FEVersion: undefined,
    scp: false,
    destination: '',
    appTitle: '',
    appVersion: '',
    sapClient: '',
    backends: [],
    sapLibs: '',
    isSAPApp: false,
    webappPath: DirName.Webapp,
    hostname: '',
    isFioriToolsProject: false,
    uiAdaptation: undefined,
    hasRootIntent: { flpSandboxRootIntent: false, flpSandboxMockRootIntent: false }
};

// Access projects created outside fiori tools e.g. WebIDE
export class ProjectAccess {
    /**
     * Get Project info from WebIDE project
     *
     * @param projectRoot
     * @param migrationType
     * @param workspaceFolders
     * @param libPath
     * @param fsEditor - optional mem-fs editor; a fresh one is created when omitted (standalone discovery)
     */
    public static async getProjectInfo(
        projectRoot: string,
        migrationType?: MigrationTypes,
        workspaceFolders?: readonly ProjectFolder[],
        libPath?: string,
        fsEditor?: Editor
    ): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
        const fs = fsEditor ?? createMemFsEditor();
        let manifest: Manifest | undefined;
        let messages: Message[] = [];
        let isReuseLib: boolean | undefined;
        let projectInfo: ImportProjectInfo = {
            ...defaultProjectInfo,
            backends: [],
            hasRootIntent: { ...defaultProjectInfo.hasRootIntent }
        };

        // Get initial webapp path
        projectInfo.webappPath = await this.getWebappPath(projectRoot, migrationType, libPath, fs);

        // Try to load manifest from standard or legacy paths
        const manifestResult = await tryLoadManifest(fs, projectRoot, projectInfo.webappPath);
        if (manifestResult) {
            manifest = manifestResult.manifest;
            projectInfo.webappPath = manifestResult.updatedWebappPath;
        }

        // Check project type flags
        const isProjectExtension = await this.checkIfProjectExtension(projectRoot, fs);

        // If no manifest found, resolve from unknown project structure
        if (!manifest) {
            const resolution = await resolveManifestForUnknownProject(
                fs,
                projectRoot,
                migrationType,
                isProjectExtension,
                (root: string) => this.checkMigratableAdaptationProject(root, fs),
                (root: string, type?: MigrationTypes) => this.checkIfReuseLib(root, type, undefined, fs)
            );
            manifest = resolution.manifest;
            if (resolution.webappPath) {
                projectInfo.webappPath = resolution.webappPath;
            }
            isReuseLib = resolution.isReuseLib;
            messages = messages.concat(resolution.messages);
        }

        // Determine reuse lib status if not yet known
        isReuseLib ??= await this.checkIfReuseLib(projectRoot, migrationType, manifest, fs);

        // Check adaptation project status
        const adaptationCheck = await this.checkMigratableAdaptationProject(projectRoot, fs);
        const isAdaptationProject = adaptationCheck?.reference !== undefined;

        // Process based on project type
        const projectType = determineProjectType(isReuseLib, isProjectExtension, isAdaptationProject, manifest);
        const result = await this.processProjectByType(
            fs,
            projectType,
            projectRoot,
            manifest,
            projectInfo,
            workspaceFolders
        );
        projectInfo = result.projectInfo;
        messages = messages.concat(result.messages);

        return { projectInfo, messages };
    }

    /**
     * Process project based on its type
     *
     * @param fs - mem-fs editor
     * @param projectType - Type of project to process
     * @param projectRoot - Project root path
     * @param manifest - Project manifest
     * @param projectInfo - Current project info
     * @param workspaceFolders - Workspace folders
     * @returns Processed project info and messages
     */
    private static async processProjectByType(
        fs: Editor,
        projectType: ProjectType,
        projectRoot: string,
        manifest: Manifest | undefined,
        projectInfo: ImportProjectInfo,
        workspaceFolders?: readonly ProjectFolder[]
    ): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
        switch (projectType) {
            case 'regular':
                return processRegularProject({
                    fs,
                    projectRoot,
                    manifest: manifest!,
                    defaultProjectInfo,
                    projectInfo,
                    services: {
                        projectData: {
                            getPackageJson: (filePath: string) => this.getPackageJson(filePath, fs),
                            getMainEntity: this.getMainEntity.bind(this),
                            hasUI5Tooling: this.hasUI5Tooling.bind(this)
                        },
                        manifestAnalysis: {
                            getSemanticObjectAction: this.getSemanticObjectAction.bind(this),
                            getVersionFromManifest: this.getVersionFromManifest.bind(this),
                            getFloorPlan: this.getFloorPlan.bind(this)
                        },
                        backendConfig: {
                            getFirstBackend: (root: string) => this.getFirstBackend(root, fs),
                            getFlpIntentFromHtml: (htmlFilePath: string) => this.getFlpIntentFromHtml(htmlFilePath, fs),
                            getDestinationFromNeoApp: (root: string, destinationIn: string) =>
                                this.getDestinationFromNeoApp(root, destinationIn, fs),
                            getClientFromDestinationName: this.getClientFromDestinationName.bind(this)
                        }
                    }
                });

            case 'reuseLib': {
                const reuseLibInfo = await processReuseLibrary(
                    projectRoot,
                    defaultProjectInfo,
                    workspaceFolders,
                    manifest,
                    (filePath: string) => this.getPackageJson(filePath, fs),
                    this.hasUI5Tooling.bind(this),
                    (root: string, folders?: readonly ProjectFolder[], mf?: Manifest) =>
                        this.getReuseLibModuleName(root, folders, mf, fs)
                );
                return {
                    // Preserve the webappPath resolved before processReuseLibrary (e.g. from .project.json)
                    // and set the default targetMockHtmlFile for libraries.
                    projectInfo: {
                        ...reuseLibInfo,
                        webappPath:
                            projectInfo.webappPath !== DirName.Webapp
                                ? projectInfo.webappPath
                                : reuseLibInfo.webappPath,
                        targetMockHtmlFile: 'test/flpSandboxMockServer.html'
                    },
                    messages: []
                };
            }

            case 'extension':
                return {
                    projectInfo: await processProjectExtension({
                        projectRoot,
                        defaultProjectInfo,
                        projectInfo,
                        manifest,
                        getPackageJson: (filePath: string) => this.getPackageJson(filePath, fs),
                        hasUI5Tooling: this.hasUI5Tooling.bind(this),
                        readProjectExtensionSettings: (root: string) => this.readProjectExtensionSettings(root, fs),
                        getExtensionProjectModuleName: this.getExtensionProjectModuleName.bind(this),
                        getDestinationFromNeoApp: (root: string, destinationIn: string) =>
                            this.getDestinationFromNeoApp(root, destinationIn, fs),
                        getFirstBackend: (root: string) => this.getFirstBackend(root, fs),
                        getClientFromDestinationName: this.getClientFromDestinationName.bind(this),
                        getFlpIntentFromHtml: (htmlFilePath: string) => this.getFlpIntentFromHtml(htmlFilePath, fs),
                        getManifestJson: (root: string, webappPath: string) =>
                            this.getManifestJson(root, webappPath, fs)
                    }),
                    messages: []
                };

            case 'adaptation':
            default:
                return {
                    projectInfo: await processAdaptationProject({
                        projectRoot,
                        defaultProjectInfo,
                        projectInfo,
                        checkMigratableAdaptationProject: (root: string) =>
                            this.checkMigratableAdaptationProject(root, fs),
                        getPackageJson: (filePath: string) => this.getPackageJson(filePath, fs),
                        hasUI5Tooling: this.hasUI5Tooling.bind(this),
                        getDestinationFromNeoApp: (root: string, destinationIn: string) =>
                            this.getDestinationFromNeoApp(root, destinationIn, fs),
                        getClientFromDestinationName: this.getClientFromDestinationName.bind(this),
                        getFirstBackend: (root: string) => this.getFirstBackend(root, fs)
                    }),
                    messages: []
                };
        }
    }

    // ========== Delegated Methods to Utilities ==========
    // These methods delegate to extracted utility modules for better organization

    public static async getWebappPath(
        projectRoot: string,
        type?: MigrationTypes,
        libPath?: string,
        fsEditor?: Editor
    ): Promise<string> {
        return getWebappPath(fsEditor ?? createMemFsEditor(), projectRoot, type, libPath);
    }

    public static getManifestPath(projectRoot: string, webappPath: string): string {
        return getManifestPath(projectRoot, webappPath);
    }

    public static getPackageJsonPath(projectRoot: string): string {
        return getPackageJsonPath(projectRoot);
    }

    public static getPackageJson(filePath: string, fsEditor?: Editor): Promise<any> {
        return getPackageJson(fsEditor ?? createMemFsEditor(), filePath);
    }

    public static async getManifestJson(projectRoot: string, webappPath: string, fsEditor?: Editor): Promise<Manifest> {
        return getManifestJson(fsEditor ?? createMemFsEditor(), projectRoot, webappPath);
    }

    public static getVersionFromManifest(manifest: Manifest) {
        return getVersionFromManifest(manifest);
    }

    public static getSemanticObjectAction(manifest: Manifest) {
        return getSemanticObjectAction(manifest);
    }

    // prettier-ignore
    public static async getFlpIntentFromHtml(htmlFilePath: string, fsEditor?: Editor) { // NOSONAR - async by contract
        return getFlpIntentFromHtml(fsEditor ?? createMemFsEditor(), htmlFilePath);
    }

    public static getFloorPlan(manifest: Manifest, feVersion: any) {
        return getFloorPlan(manifest, feVersion);
    }

    public static getMainEntity(manifest: Manifest) {
        return getMainEntity(manifest);
    }

    public static getFirstBackend(projectRoot: string, fsEditor?: Editor): ReturnType<typeof getFirstBackend> {
        return getFirstBackend(fsEditor ?? createMemFsEditor(), projectRoot);
    }

    public static async checkMigratableAdaptationProject(projectRoot: string, fsEditor?: Editor) {
        return checkMigratableAdaptationProject(fsEditor ?? createMemFsEditor(), projectRoot);
    }

    public static async checkIfReuseLib(
        projectRoot: string,
        type?: MigrationTypes,
        manifest?: Manifest,
        fsEditor?: Editor
    ) {
        return checkIfReuseLib(projectRoot, type, manifest, fsEditor ?? createMemFsEditor());
    }

    public static async readProjectExtensionSettings(projectRoot: string, fsEditor?: Editor) {
        return readProjectExtensionSettings(fsEditor ?? createMemFsEditor(), projectRoot);
    }

    public static async checkIfProjectExtension(projectRoot: string, fsEditor?: Editor) {
        return checkIfProjectExtension(fsEditor ?? createMemFsEditor(), projectRoot);
    }

    public static isFioriToolsAdaptationProject(projectRoot: string, fsEditor?: Editor) {
        return isFioriToolsAdaptationProject(fsEditor ?? createMemFsEditor(), projectRoot);
    }

    public static async getReuseLibModuleName(
        projectRoot: string,
        workspaceFolders?: readonly ProjectFolder[],
        manifest?: Manifest,
        fsEditor?: Editor
    ) {
        return getReuseLibModuleName(projectRoot, workspaceFolders, manifest, fsEditor ?? createMemFsEditor());
    }

    public static getExtensionProjectModuleName(projectRoot: string, projectSettings: any, manifest?: Manifest) {
        return getExtensionProjectModuleName(projectRoot, projectSettings, manifest);
    }

    public static getNeoAppData(neoAppJson: any, destination: string, isUiAdaptation = false) {
        return getNeoAppData(neoAppJson, destination, isUiAdaptation);
    }

    public static async getDestinationFromNeoApp(projectRoot: string, destinationIn: string, fsEditor?: Editor) {
        return getDestinationFromNeoApp(fsEditor ?? createMemFsEditor(), projectRoot, destinationIn);
    }

    public static getClientFromDestinationName(destination: string) {
        return getClientFromDestinationName(destination);
    }

    // ========== Core Methods (Not Delegated) ==========

    public static async getProjectRoots(
        workspaceRoots: readonly ProjectFolder[],
        sapuxRequired = false,
        fsEditor?: Editor
    ): Promise<MigratableFolder[]> {
        const fs = fsEditor ?? createMemFsEditor();
        // find projects by package.json and pom.xml
        // Convert ProjectFolder[] to string[] for project-access functions
        const workspaceRootPaths = workspaceRoots.map((folder) => folder.uri.fsPath);
        const packageRoots = await findAllProjectRoots(fs, workspaceRootPaths, sapuxRequired);
        const pomRoots = await findAllWebIDEProjectFolders(fs, workspaceRoots);
        // find projects by manifest.json in the root
        let manifestRoots = await findProjectsByManifest(workspaceRoots as ProjectFolder[]);
        // A root can be discovered by more than one strategy (e.g. a project with both package.json
        // and pom.xml), so deduplicate before building folders — otherwise getReuseLibs scans the
        // same folder twice and returns duplicate library entries.
        const roots = [...new Set([...packageRoots, ...pomRoots])];
        // filter projects with manifest.json at root, when the project is nested in another migratble project.
        // Reject exact matches too: a package/pom root that also has a root-level manifest.json would
        // otherwise be re-appended here, defeating the dedup above and getting scanned twice again.
        manifestRoots = manifestRoots.filter(
            (manifestRoot) => !roots.some((root) => manifestRoot === root || manifestRoot.startsWith(root + sep))
        );
        roots.push(...manifestRoots);

        const rootFolders = roots.map((root, index) => {
            return {
                uri: URI.file(root),
                index: index,
                name: root
            };
        });

        // find reuse libs
        let reuseLibsRoots = (await getReuseLibs(fs, rootFolders)).filter(
            (lib) => lib.value.type === ReuseLibType.LIBRARY
        );
        // Roots that are themselves reuse libraries must be emitted only as libraries, never also as
        // plain projects. getReuseLibs assigns a nested library to its nearest package/pom root, so a
        // freestyle app that merely embeds a library shares that libRoot — suppressing by libRoot alone
        // would wrongly drop the app. A root is library-only when it is itself a discovered library root
        // AND getProjectInfo does not classify it as an application (no FE version, not an SAP app).
        // getProjectInfo's own type is not sufficient on its own: a library whose manifest.json lives in
        // a non-standard nested source path (e.g. src/.../lib/manifest.json) is not resolved as a library
        // by the default webapp lookup, so the libRoot signal is needed to catch it.
        const libraryOnlyRoots = new Set<string>();
        if (reuseLibsRoots.length) {
            const reuseLibRootPaths = new Set(reuseLibsRoots.map((lib) => lib.value.libRoot));
            const appRoots: string[] = [];
            // Resolve project info for all roots in parallel (independent lookups).
            const rootInfos = await Promise.all(
                roots.map(async (root) => ({
                    root,
                    info: (await this.getProjectInfo(root, undefined, undefined, undefined, fs)).projectInfo
                }))
            );
            for (const { root, info } of rootInfos) {
                const isApp = !!(info.FEVersion || info.isSAPApp);
                if (isApp) {
                    appRoots.push(root);
                } else if (
                    [...reuseLibRootPaths].some((libRoot) => isSamePath(libRoot, root)) ||
                    info.type === MigrationTypes.library
                ) {
                    libraryOnlyRoots.add(root);
                }
            }
            // After classifying all roots, filter out reuse libs detected in application projects
            reuseLibsRoots = reuseLibsRoots.filter(
                (lib) => !appRoots.some((appRoot) => isSamePath(lib.value.libRoot, appRoot))
            );
        }

        // if workspace has multiple roots then make sure there are no similar projects
        const projectsUnique: MigratableFolder[] = [...new Set(roots)]
            .filter((root) => !libraryOnlyRoots.has(root))
            .map((root) => {
                return {
                    root: root,
                    type: MigrationTypes.project
                };
            });

        // A single library root can contain several nested manifest.json files (the library manifest
        // plus per-component manifests), each of which getReuseLibs resolves back to the same libRoot.
        // The emitted entry is keyed on libRoot (root: lib.value.libRoot), so deduplicate on libRoot —
        // not on lib.value.path, which is distinct per nested manifest and would let the same library
        // through multiple times. Keep the first occurrence so libRoot/libPath stay paired (PR #39527).
        const seenLibRoots: string[] = [];
        const reuseLibsUnique: MigratableFolder[] = reuseLibsRoots
            .filter((lib) => {
                if (seenLibRoots.some((libRoot) => isSamePath(libRoot, lib.value.libRoot))) {
                    return false;
                }
                seenLibRoots.push(lib.value.libRoot);
                return true;
            })
            .map((lib) => {
                return {
                    root: lib.value.libRoot,
                    type: MigrationTypes.library,
                    libPath: dirname(lib.value.path)
                };
            });

        const rootsUniqueSorted = [...reuseLibsUnique, ...projectsUnique].sort((a, b) => a.root.localeCompare(b.root));

        return [...rootsUniqueSorted];
    }

    public static hasUI5Tooling(packageJSON?: Package): boolean {
        return !!(
            (packageJSON?.dependencies &&
                ('@sap-ux/ui5-tooling' in packageJSON.dependencies ||
                    '@sap/ux-ui5-tooling' in packageJSON.dependencies)) ||
            (packageJSON?.devDependencies &&
                ('@sap-ux/ui5-tooling' in packageJSON.devDependencies ||
                    '@sap/ux-ui5-tooling' in packageJSON.devDependencies))
        );
    }
}
