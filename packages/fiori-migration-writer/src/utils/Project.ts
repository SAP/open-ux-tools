import { dirname, join, relative, sep } from 'node:path';
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
    isSamePath,
    getClientFromDestinationName,
    getNeoAppData,
    getDestinationFromNeoApp
} from './project-readers/index.js';

/**
 * Try to load manifest from standard or legacy paths
 *
 * @param projectRoot - Project root path
 * @param webappPath - Webapp path
 * @returns Manifest and updated webapp path, or undefined if not found
 */
async function tryLoadManifest(
    projectRoot: string,
    webappPath: string
): Promise<{ manifest: Manifest; updatedWebappPath: string } | undefined> {
    // Try standard location first
    try {
        const manifest = await getManifestJson(projectRoot, webappPath);
        return { manifest, updatedWebappPath: webappPath };
    } catch {
        // Expected: manifest.json may not exist in standard location
    }

    // Try legacy path
    try {
        const manifest = await getManifestJson(join(projectRoot, legacyPath), webappPath);
        return { manifest, updatedWebappPath: join(legacyPath, webappPath) };
    } catch {
        // Expected: manifest.json not found in either path
    }

    return undefined;
}

/**
 * Try to find manifest in nested reuse lib structure
 *
 * @param projectRoot - Project root path
 * @returns Manifest and webapp path if found
 */
async function tryFindNestedLibManifest(
    projectRoot: string
): Promise<{ manifest: Manifest; webappPath: string } | undefined> {
    const nestedLib = await findNestedReuseLibManifest(projectRoot);
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
 * @param projectRoot - Project root path
 * @param migrationType - Migration type
 * @param isProjectExtension - Whether project is an extension
 * @param checkMigratableAdaptationProject - Function to check adaptation project
 * @param checkIfReuseLib - Function to check if reuse library
 * @returns Resolution result with manifest, webappPath, isReuseLib flag, and messages
 */
async function resolveManifestForUnknownProject(
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
        const nestedLib = await tryFindNestedLibManifest(projectRoot);
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
     */
    public static async getProjectInfo(
        projectRoot: string,
        migrationType?: MigrationTypes,
        workspaceFolders?: readonly ProjectFolder[],
        libPath?: string
    ): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
        let manifest: Manifest | undefined;
        let messages: Message[] = [];
        let isReuseLib: boolean | undefined;
        let projectInfo: ImportProjectInfo = {
            ...defaultProjectInfo,
            backends: [],
            hasRootIntent: { ...defaultProjectInfo.hasRootIntent }
        };

        // Get initial webapp path
        projectInfo.webappPath = await this.getWebappPath(projectRoot, migrationType, libPath);

        // Try to load manifest from standard or legacy paths
        const manifestResult = await tryLoadManifest(projectRoot, projectInfo.webappPath);
        if (manifestResult) {
            manifest = manifestResult.manifest;
            projectInfo.webappPath = manifestResult.updatedWebappPath;
        }

        // Check project type flags
        const isProjectExtension = await this.checkIfProjectExtension(projectRoot);

        // If no manifest found, resolve from unknown project structure
        if (!manifest) {
            const resolution = await resolveManifestForUnknownProject(
                projectRoot,
                migrationType,
                isProjectExtension,
                this.checkMigratableAdaptationProject.bind(this),
                this.checkIfReuseLib.bind(this)
            );
            manifest = resolution.manifest;
            if (resolution.webappPath) {
                projectInfo.webappPath = resolution.webappPath;
            }
            isReuseLib = resolution.isReuseLib;
            messages = messages.concat(resolution.messages);
        }

        // Determine reuse lib status if not yet known
        isReuseLib ??= await this.checkIfReuseLib(projectRoot, migrationType, manifest);

        // Check adaptation project status
        const adaptationCheck = await this.checkMigratableAdaptationProject(projectRoot);
        const isAdaptationProject = adaptationCheck?.reference !== undefined;

        // Process based on project type
        const projectType = determineProjectType(isReuseLib, isProjectExtension, isAdaptationProject, manifest);
        const result = await this.processProjectByType(
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
     * @param projectType - Type of project to process
     * @param projectRoot - Project root path
     * @param manifest - Project manifest
     * @param projectInfo - Current project info
     * @param workspaceFolders - Workspace folders
     * @returns Processed project info and messages
     */
    private static async processProjectByType(
        projectType: ProjectType,
        projectRoot: string,
        manifest: Manifest | undefined,
        projectInfo: ImportProjectInfo,
        workspaceFolders?: readonly ProjectFolder[]
    ): Promise<{ projectInfo: ImportProjectInfo; messages: Message[] }> {
        switch (projectType) {
            case 'regular':
                return processRegularProject({
                    projectRoot,
                    manifest: manifest!,
                    defaultProjectInfo,
                    projectInfo,
                    services: {
                        projectData: {
                            getPackageJson: this.getPackageJson.bind(this),
                            getMainEntity: this.getMainEntity.bind(this),
                            hasUI5Tooling: this.hasUI5Tooling.bind(this)
                        },
                        manifestAnalysis: {
                            getSemanticObjectAction: this.getSemanticObjectAction.bind(this),
                            getVersionFromManifest: this.getVersionFromManifest.bind(this),
                            getFloorPlan: this.getFloorPlan.bind(this)
                        },
                        backendConfig: {
                            getFirstBackend: this.getFirstBackend.bind(this),
                            getFlpIntentFromHtml: this.getFlpIntentFromHtml.bind(this),
                            getDestinationFromNeoApp: this.getDestinationFromNeoApp.bind(this),
                            getClientFromDestinationName: this.getClientFromDestinationName.bind(this)
                        }
                    }
                });

            case 'reuseLib':
                return {
                    projectInfo: await processReuseLibrary(
                        projectRoot,
                        defaultProjectInfo,
                        workspaceFolders,
                        manifest,
                        this.getPackageJson.bind(this),
                        this.hasUI5Tooling.bind(this),
                        this.getReuseLibModuleName.bind(this)
                    ),
                    messages: []
                };

            case 'extension':
                return {
                    projectInfo: await processProjectExtension({
                        projectRoot,
                        defaultProjectInfo,
                        projectInfo,
                        manifest,
                        getPackageJson: this.getPackageJson.bind(this),
                        hasUI5Tooling: this.hasUI5Tooling.bind(this),
                        readProjectExtensionSettings: this.readProjectExtensionSettings.bind(this),
                        getExtensionProjectModuleName: this.getExtensionProjectModuleName.bind(this),
                        getDestinationFromNeoApp: this.getDestinationFromNeoApp.bind(this),
                        getFirstBackend: this.getFirstBackend.bind(this),
                        getClientFromDestinationName: this.getClientFromDestinationName.bind(this),
                        getFlpIntentFromHtml: this.getFlpIntentFromHtml.bind(this),
                        getManifestJson: this.getManifestJson.bind(this)
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
                        checkMigratableAdaptationProject: this.checkMigratableAdaptationProject.bind(this),
                        getPackageJson: this.getPackageJson.bind(this),
                        hasUI5Tooling: this.hasUI5Tooling.bind(this),
                        getDestinationFromNeoApp: this.getDestinationFromNeoApp.bind(this),
                        getClientFromDestinationName: this.getClientFromDestinationName.bind(this),
                        getFirstBackend: this.getFirstBackend.bind(this)
                    }),
                    messages: []
                };
        }
    }

    // ========== Delegated Methods to Utilities ==========
    // These methods delegate to extracted utility modules for better organization

    public static async getWebappPath(projectRoot: string, type?: MigrationTypes, libPath?: string): Promise<string> {
        return getWebappPath(projectRoot, type, libPath);
    }

    public static getManifestPath(projectRoot: string, webappPath: string): string {
        return getManifestPath(projectRoot, webappPath);
    }

    public static getPackageJsonPath(projectRoot: string): string {
        return getPackageJsonPath(projectRoot);
    }

    public static getPackageJson(filePath: string): Promise<any> {
        return getPackageJson(filePath);
    }

    public static async getManifestJson(projectRoot: string, webappPath: string): Promise<Manifest> {
        return getManifestJson(projectRoot, webappPath);
    }

    public static getVersionFromManifest(manifest: Manifest) {
        return getVersionFromManifest(manifest);
    }

    public static getSemanticObjectAction(manifest: Manifest) {
        return getSemanticObjectAction(manifest);
    }

    public static async getFlpIntentFromHtml(htmlFilePath: string) {
        return getFlpIntentFromHtml(htmlFilePath);
    }

    public static getFloorPlan(manifest: Manifest, feVersion: any) {
        return getFloorPlan(manifest, feVersion);
    }

    public static getMainEntity(manifest: Manifest) {
        return getMainEntity(manifest);
    }

    public static getFirstBackend(projectRoot: string): Promise<ReturnType<typeof getFirstBackend>> {
        return Promise.resolve(getFirstBackend(projectRoot));
    }

    public static async checkMigratableAdaptationProject(projectRoot: string) {
        return checkMigratableAdaptationProject(projectRoot);
    }

    public static async checkIfReuseLib(projectRoot: string, type?: MigrationTypes, manifest?: Manifest) {
        return checkIfReuseLib(projectRoot, type, manifest);
    }

    public static async readProjectExtensionSettings(projectRoot: string) {
        return readProjectExtensionSettings(projectRoot);
    }

    public static async checkIfProjectExtension(projectRoot: string) {
        return checkIfProjectExtension(projectRoot);
    }

    public static async isFioriToolsAdaptationProject(projectRoot: string) {
        return isFioriToolsAdaptationProject(projectRoot);
    }

    public static async getReuseLibModuleName(
        projectRoot: string,
        workspaceFolders?: readonly ProjectFolder[],
        manifest?: Manifest
    ) {
        return getReuseLibModuleName(projectRoot, workspaceFolders, manifest);
    }

    public static getExtensionProjectModuleName(projectRoot: string, projectSettings: any, manifest?: Manifest) {
        return getExtensionProjectModuleName(projectRoot, projectSettings, manifest);
    }

    public static getNeoAppData(neoAppJson: any, destination: string, isUiAdaptation = false) {
        return getNeoAppData(neoAppJson, destination, isUiAdaptation);
    }

    public static async getDestinationFromNeoApp(projectRoot: string, destinationIn: string) {
        return getDestinationFromNeoApp(projectRoot, destinationIn);
    }

    public static getClientFromDestinationName(destination: string) {
        return getClientFromDestinationName(destination);
    }

    // ========== Core Methods (Not Delegated) ==========

    public static async getProjectRoots(
        workspaceRoots: readonly ProjectFolder[],
        sapuxRequired = false
    ): Promise<MigratableFolder[]> {
        // find projects by package.json and pom.xml
        // Convert ProjectFolder[] to string[] for project-access functions
        const workspaceRootPaths = workspaceRoots.map((folder) => folder.uri.fsPath);
        const packageRoots = await findAllProjectRoots(workspaceRootPaths, sapuxRequired);
        const pomRoots = await findAllWebIDEProjectFolders(workspaceRoots);
        // find projects by manifest.json in the root
        let manifestRoots = await findProjectsByManifest(workspaceRoots as ProjectFolder[]);
        const roots = [...packageRoots, ...pomRoots];
        // filter projects with manifest.json at root, when the project is nested in another migratble project
        manifestRoots = manifestRoots.filter(
            (manifestRoot) => !roots.some((root) => manifestRoot.startsWith(root + sep))
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
        let reuseLibsRoots = (await getReuseLibs(rootFolders)).filter((lib) => lib.value.type === ReuseLibType.LIBRARY);
        if (reuseLibsRoots.length) {
            const temp: any[] = [];
            // Process roots sequentially to build accurate exclusion list for reuse libs
            for (const root of roots) {
                const result = await this.getProjectInfo(root);
                // get roots for projects
                if (result.projectInfo.FEVersion || result.projectInfo.isSAPApp) {
                    temp.push(root);
                }
                // in case reuse libs were detected in a project, remove them
                reuseLibsRoots = reuseLibsRoots.filter(
                    (lib) => !temp.some((tempRoot) => isSamePath(lib.value.libRoot, tempRoot))
                );
            }
        }
        // if workspace has multiple roots then make sure there are no similar projects
        const projectsUnique: MigratableFolder[] = [...new Set(roots)].map((root) => {
            return {
                root: root,
                type: MigrationTypes.project
            };
        });

        const reuseLibsUnique: MigratableFolder[] = reuseLibsRoots.map((lib) => {
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
