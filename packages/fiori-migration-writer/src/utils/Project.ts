import { dirname, join, sep } from 'node:path';
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
    getReuseLibModuleName,
    getClientFromDestinationName,
    getNeoAppData,
    getDestinationFromNeoApp
} from './project-readers/index.js';

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
        let projectInfo: ImportProjectInfo = defaultProjectInfo;
        projectInfo.webappPath = await this.getWebappPath(projectRoot, migrationType, libPath);
        // Step1. Get manifest.json
        try {
            manifest = await this.getManifestJson(projectRoot, projectInfo.webappPath);
        } catch {
            // Expected: manifest.json may not exist in standard location for legacy projects.
            // Will try legacy path next.
        }
        const isProjectExtension: boolean | undefined = await this.checkIfProjectExtension(projectRoot);
        if (!manifest) {
            try {
                manifest = await this.getManifestJson(join(projectRoot, legacyPath), projectInfo.webappPath);
                projectInfo.webappPath = join(legacyPath, projectInfo.webappPath);
            } catch {
                // Expected: manifest.json not found in either standard or legacy path.
                // Valid for reuse libraries and project extensions - they may not have manifest.json.
                isReuseLib = await this.checkIfReuseLib(projectRoot, migrationType);

                if (isReuseLib || isProjectExtension) {
                    // dont throw error if reuse lib or project extension
                } else if ((await this.checkMigratableAdaptationProject(projectRoot)) === undefined) {
                    // Rare! But handle it if its a very old UI5 App
                    messages = messages.concat([
                        { type: 'ERROR', description: i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION') }
                    ]);
                }
            }
        }

        if (isReuseLib === undefined) {
            isReuseLib = await this.checkIfReuseLib(projectRoot, migrationType, manifest);
        }
        if (manifest && !isReuseLib && !isProjectExtension) {
            const result = await processRegularProject({
                projectRoot,
                manifest,
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
            projectInfo = result.projectInfo;
            messages = messages.concat(result.messages);
        } else if (isReuseLib && !isProjectExtension) {
            projectInfo = await processReuseLibrary(
                projectRoot,
                defaultProjectInfo,
                workspaceFolders,
                manifest,
                this.getPackageJson.bind(this),
                this.hasUI5Tooling.bind(this),
                this.getReuseLibModuleName.bind(this)
            );
        } else if (isProjectExtension) {
            projectInfo = await processProjectExtension({
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
            });
        } else {
            projectInfo = await processAdaptationProject({
                projectRoot,
                defaultProjectInfo,
                projectInfo,
                checkMigratableAdaptationProject: this.checkMigratableAdaptationProject.bind(this),
                getPackageJson: this.getPackageJson.bind(this),
                hasUI5Tooling: this.hasUI5Tooling.bind(this),
                getDestinationFromNeoApp: this.getDestinationFromNeoApp.bind(this),
                getClientFromDestinationName: this.getClientFromDestinationName.bind(this),
                getFirstBackend: this.getFirstBackend.bind(this)
            });
        }
        return { projectInfo, messages };
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

    public static async getFirstBackend(projectRoot: string) {
        return getFirstBackend(projectRoot);
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
            for (const root of roots) {
                const result = await this.getProjectInfo(root);
                // get roots for projects
                if (result.projectInfo.FEVersion || result.projectInfo.isSAPApp) {
                    temp.push(root);
                }
                // in case reuse libs were detected in a project, remove them
                reuseLibsRoots = reuseLibsRoots.filter(
                    (lib) => !temp.some((tempRoot) => lib.value.libRoot === tempRoot)
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
            (packageJSON?.dependencies && '@sap/ux-ui5-tooling' in packageJSON.dependencies) ||
            (packageJSON?.devDependencies && '@sap/ux-ui5-tooling' in packageJSON.devDependencies)
        );
    }
}
