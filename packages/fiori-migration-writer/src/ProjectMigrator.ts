import { FioriElementsVersion, FileName } from './project-spec-types.js';
import { determineMessage, readFile, updateFile, fileExists } from './utils/index.js';
import { createMemFsEditor, loadProjectIntoEditor } from './utils/fs-adapter.js';
import { ui5VersionRequestInfo } from '@sap-ux/ui5-info';
import { getAppProgrammingLanguage } from '@sap-ux/project-access';
import { enableTypescript, ui5TSSupport } from '@sap-ux/ui5-application-writer';
import { UI5Config } from '@sap-ux/ui5-config';
import { join } from 'node:path';

// Migration-specific functions
import {
    determineSourceTemplateType,
    checkForErrors,
    createMigrationErrorMessage,
    prepareConfigurationData,
    setupProjectStructure,
    generateAppSettings,
    applyAllTemplates,
    postProcessMigration
} from './migration-process/index.js';

// File operations
import { copyAdaptationFiles, copyLibraryFiles } from './files/index.js';

// Template functions
import { assembleTemplateData } from './template/index.js';

// Project functions
import { loadOrFetchProjectInfo, validateProjectForMigration } from './project/index.js';

// Data functions
import { resolveUI5VersionsForMigration } from './data/index.js';

import type { ImportProjectInfo, Message } from './types.js';
import { MigrationTypes } from './utils/constants.js';
import type { Editor } from 'mem-fs-editor';
import { hasStore } from './types/mem-fs-types.js';
import { i18nText, initI18n } from './i18n.js';

/**
 * Configuration options for the migrate method
 */
export interface MigrateOptions {
    /** Root path of the project to migrate */
    projectRoot: string;
    /** Base URI for backend services */
    baseUri: string;
    /** URL for UI5 snapshot version */
    ui5SnapshotUrl: string;
    /** Optional partial project information */
    importProjectInfo?: Partial<ImportProjectInfo>;
    /** Optional VS Code context */
    vscode?: any;
    /** Enable internal features (default: false) */
    internalToggle?: boolean;
    /** Optional mem-fs editor instance. If not provided, a new one will be created */
    fs?: Editor;
    /** Enable strict validation mode - WARNINGs become ERRORs for critical issues (default: false) */
    strict?: boolean;
}

export class ProjectMigrator {
    /**
     * migrate project
     *
     * @param options - Migration options object
     * @returns Promise with fs editor, migration result, and messages
     */
    // Backward-compatible overload with positional parameters
    public static async migrate( // NOSONAR - Overload for backward compatibility; use options object signature instead
        projectRoot: string,
        baseUri?: string,
        ui5SnapshotUrl?: string,
        importProjectInfo?: ImportProjectInfo,
        vscode?: any,
        internalToggle?: boolean,
        fs?: Editor,
        strict?: boolean
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }>;

    // New preferred signature with options object
    public static async migrate(options: MigrateOptions): Promise<{ fs: Editor; result: boolean; messages: Message[] }>;

    // Implementation
    public static async migrate(
        // NOSONAR - Implementation must support both overload signatures
        projectRootOrOptions: string | MigrateOptions,
        baseUri?: string,
        ui5SnapshotUrl?: string,
        importProjectInfo?: ImportProjectInfo,
        vscode?: any,
        internalToggle?: boolean,
        fs?: Editor,
        strict?: boolean
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        // Convert old signature to options object if called with positional parameters
        const options: MigrateOptions =
            typeof projectRootOrOptions === 'string'
                ? {
                      projectRoot: projectRootOrOptions,
                      baseUri: baseUri ?? '',
                      ui5SnapshotUrl: ui5SnapshotUrl ?? '',
                      importProjectInfo,
                      vscode,
                      internalToggle,
                      fs,
                      strict
                  }
                : projectRootOrOptions;
        const {
            projectRoot,
            baseUri: baseUriOpt,
            ui5SnapshotUrl: ui5SnapshotUrlOpt,
            importProjectInfo: importProjectInfoOpt,
            vscode: vscodeOpt,
            internalToggle: internalToggleOpt = false,
            fs: fsOpt,
            strict: strictOpt = false
        } = options;

        // Create a new isolated editor instance for this migration if not provided
        // This enables concurrent migrations without shared state corruption
        const ownsEditor = !fsOpt;
        const editor = fsOpt ?? createMemFsEditor();
        await initI18n();

        let messages: Message[] = [];
        let result = false;

        try {
            // Load the project tree into mem-fs so existence checks see untracked files
            // on disk and migration writes never silently overwrite them.
            await loadProjectIntoEditor(editor, projectRoot);

            // Load or fetch project information
            const { projectInfo, messages: projectInfoMessages } = await loadOrFetchProjectInfo(
                projectRoot,
                importProjectInfoOpt,
                editor
            );
            messages = messages.concat(projectInfoMessages);

            projectInfo.baseUri = baseUriOpt;

            // Resolve UI5 versions for migration
            const ui5Versions = await resolveUI5VersionsForMigration(projectInfo, ui5SnapshotUrlOpt);
            projectInfo.localUI5Version = ui5Versions?.[0]?.version;
            // ui5Version left as-is from project/neo-app data

            // Validate project is suitable for migration (not a Fiori app in CAP project)
            await validateProjectForMigration(editor, projectRoot);

            if (
                projectInfo &&
                (projectInfo.isSAPApp ||
                    projectInfo.FEVersion === FioriElementsVersion.v2 ||
                    projectInfo.FEVersion === FioriElementsVersion.v4 ||
                    projectInfo.type === MigrationTypes.projectExtension) &&
                checkForErrors(messages)
            ) {
                // V2 is supported (checkForErrors returns true if no ERROR-level messages)
                const { messages: copyMessages, result: isSuccess } = await this.copyCommonFiles(
                    editor,
                    projectInfo,
                    vscodeOpt,
                    ui5SnapshotUrlOpt,
                    internalToggleOpt,
                    strictOpt
                );
                messages = messages.concat(copyMessages);
                result = isSuccess;
            } else if (projectInfo.type === MigrationTypes.library) {
                const { messages: copyMessages, result: isSuccess } = await this.copyLibraryFiles(editor, projectInfo);
                messages = messages.concat(copyMessages);
                result = isSuccess;
            } else if (projectInfo.uiAdaptation) {
                const { messages: copyMessages, result: isSuccess } = await this.copyAdaptationFiles(
                    editor,
                    projectInfo,
                    ui5SnapshotUrlOpt
                );
                messages = messages.concat(copyMessages);
                result = isSuccess;
            } else {
                messages.push({ type: 'ERROR', description: i18nText('ERROR_FAILED_TO_GET_PROJECT_INFO') });
            }
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            const useMessage = typeof e === 'object' && e !== null && 'useMessage' in e ? Boolean(e.useMessage) : false;
            messages.push({
                type: 'ERROR',
                description: `Error during migration: ${determineMessage(error, undefined, useMessage)}`
            });
        }

        const migrationResult = { fs: editor, result, messages };

        // Commit only when we own the editor; otherwise the caller commits (matches other writers).
        if (ownsEditor && migrationResult.result) {
            try {
                await new Promise<void>((resolve, reject) =>
                    migrationResult.fs.commit((error) => (error ? reject(error) : resolve()))
                );
            } catch (error) {
                migrationResult.result = false;
                migrationResult.messages.push({
                    type: 'ERROR',
                    description: `Error committing migration: ${error instanceof Error ? error.message : String(error)}`
                });
            }
        }

        return migrationResult;
    }

    /**
     * Copy files from templates into the project
     * Orchestrates the migration process through distinct phases
     *
     * @param fs - mem-fs editor
     * @param projectInfo - Project information
     * @param vscode - VS Code context
     * @param ui5SnapshotUrl - UI5 snapshot URL
     * @param internalToggle - Internal feature toggle
     * @param strict - Enable strict validation mode (WARNINGs become ERRORs for critical issues)
     * @returns Migration result with status and messages
     */
    private static async copyCommonFiles(
        fs: Editor,
        projectInfo: ImportProjectInfo,
        vscode: any,
        ui5SnapshotUrl: string,
        internalToggle: boolean = false,
        strict: boolean = false
    ): Promise<{ result: boolean; messages: Message[] }> {
        const messages: Message[] = [];
        const { isSAPApp = false, rootPath, destination, neoappDestinations, firstNeoAppDestination } = projectInfo;

        try {
            // Detect TypeScript project
            const isTypeScriptApp = await ProjectMigrator.detectTypeScriptApp(fs, rootPath, projectInfo.webappPath);

            // Prepare configuration data
            const configData = await prepareConfigurationData(fs, projectInfo, projectInfo.ui5Version, isTypeScriptApp);

            // Phase 1: Setup project structure
            const { webappPath, keepIndex } = await setupProjectStructure(fs, projectInfo, rootPath);
            projectInfo.webappPath = webappPath;

            // Phase 2: Assemble template data
            const templateContext = await assembleTemplateData({
                fs,
                projectInfo,
                rootPath,
                projectData: configData.projectData,
                serviceData: configData.serviceData,
                config: {
                    semanticObject: configData.semanticObject,
                    fullyQualifiedProjectName: configData.fullyQualifiedProjectName,
                    fullyQualifiedProjectNameAMD: configData.fullyQualifiedProjectNameAMD,
                    sapUiLibs: configData.sapUiLibs,
                    ui5Theme: configData.ui5Theme,
                    projectUI5Version: configData.projectUI5Version,
                    baseUiLibsStr: configData.baseUiLibsStr,
                    supportedThemes: configData.supportedThemes,
                    sapClientParam: configData.sapClientParam
                },
                moduleInfo: {
                    moduleName: projectInfo.moduleName,
                    moduleDescription: projectInfo.moduleDescription,
                    destination
                },
                ui5Config: {
                    projectUI5Version: configData.projectUI5Version,
                    localUI5Version: projectInfo.localUI5Version,
                    ui5Version: projectInfo.ui5Version,
                    ui5SnapshotUrl,
                    ui5VersionRequestInfo,
                    ui5Theme: configData.ui5Theme
                },
                backendConfig: {
                    baseUri: projectInfo.baseUri ?? '',
                    scp: projectInfo.scp,
                    destination,
                    sapClient: projectInfo.sapClient
                },
                libraryConfig: {
                    sapLibs: projectInfo.sapLibs ?? '',
                    baseUiLibsStr: configData.baseUiLibsStr,
                    supportedThemes: configData.supportedThemes
                },
                flags: {
                    keepIndex,
                    internalToggle,
                    hasRootIntent: projectInfo.hasRootIntent,
                    floorPlan: projectInfo.floorPlan
                }
            });

            // Phase 3: Generate app settings
            const sourceTemplateType = determineSourceTemplateType(projectInfo, MigrationTypes);
            await generateAppSettings({
                fs,
                rootPath,
                templateData: templateContext.templateData,
                destination,
                webappPath,
                messages,
                sourceTemplateType,
                hasDataSource: templateContext.hasDataSource,
                neoappDestinations,
                sourceTemplateTest: projectInfo.sourceTemplate,
                firstNeoAppDestination,
                strict
            });

            // Phase 4: Apply all templates
            await applyAllTemplates({
                fs,
                projectInfo,
                rootPath,
                templateData: templateContext.templateData,
                hasDataSource: templateContext.hasDataSource,
                finalKeepIndex: templateContext.keepIndex,
                internalToggle,
                ui5Version: projectInfo.ui5Version,
                isSAPApp,
                appIntent: templateContext.appIntent ?? '',
                appMockIntent: templateContext.appMockIntent
            });

            // Phase 5: Post-processing
            await postProcessMigration({
                fs,
                projectInfo,
                rootPath,
                manifestJSON: templateContext.manifestJSON,
                vscode,
                appIntent: templateContext.appIntent,
                appMockIntent: templateContext.appMockIntent,
                flpSandboxAvailable: templateContext.flpSandboxAvailable,
                messages,
                strict
            });

            // Phase 6: TypeScript setup (if TypeScript app detected)
            if (isTypeScriptApp) {
                const tsMessages = await ProjectMigrator.setupTypeScript(fs, rootPath);
                messages.push(...tsMessages);
            }

            return { result: checkForErrors(messages), messages };
        } catch (e) {
            return {
                result: false,
                messages: [...messages, { type: 'ERROR', description: createMigrationErrorMessage(e) }]
            };
        }
    }

    /**
     * Copy files from templates into the project
     *
     * @param fs - mem-fs editor
     * @param projectInfo
     * @param snapshotUrl
     */
    private static async copyAdaptationFiles(
        fs: Editor,
        projectInfo: ImportProjectInfo,
        snapshotUrl: string
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        return copyAdaptationFiles(fs, projectInfo, snapshotUrl);
    }

    /**
     * Copy files from templates into the project
     *
     * @param fs
     * @param projectInfo
     */
    private static async copyLibraryFiles(
        fs: Editor,
        projectInfo: ImportProjectInfo
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        return copyLibraryFiles(fs, projectInfo);
    }

    /**
     * Configures a downloaded TypeScript app for local development.
     * Generates tsconfig.json and TypeScript devDependencies via {@link enableTypescript},
     * then patches ui5-local.yaml and ui5-mock.yaml with the transpile middleware and task.
     *
     * @param fs - The mem-fs editor.
     * @param rootPath - The project root path.
     * @returns Messages to surface to the user after setup.
     */
    private static async setupTypeScript(fs: Editor, rootPath: string): Promise<Message[]> {
        const messages: Message[] = [];
        try {
            await enableTypescript(rootPath, fs);
        } catch (err) {
            messages.push({
                type: 'ERROR',
                description: `Error enabling TypeScript: ${err instanceof Error ? err.message : String(err)}`
            });
            return messages;
        }
        // Check and update ui5*.yaml files sequentially - order doesn't matter but list is small
        for (const yamlName of [FileName.UI5LocalYaml, FileName.UI5MockYaml]) {
            const yamlPath = join(rootPath, yamlName);

            if (fileExists(fs, yamlPath)) {
                const yamlContent = readFile(fs, yamlPath);

                const yamlConfig = await UI5Config.newInstance(yamlContent); // NOSONAR - Sequential YAML parsing required
                yamlConfig.addCustomMiddleware([ui5TSSupport.middleware]);
                yamlConfig.addCustomTasks([ui5TSSupport.task]);
                updateFile(fs, yamlPath, yamlConfig.toString());
            }
        }
        messages.push({
            type: 'WARNING',
            description: i18nText('TYPESCRIPT_STRICT_MODE_WARNING')
        });
        return messages;
    }

    /**
     * Detects whether the project is a TypeScript application.
     * First attempts detection via {@link getAppProgrammingLanguage}, which relies on tsconfig.json being present.
     * Falls back to scanning the webapp folder for .ts files directly, since after a download from ABAP
     * the project will not yet have a tsconfig.json — it is added as part of the migration itself.
     *
     * @param fs - The mem-fs editor.
     * @param rootPath - The project root path.
     * @param webappPath - The relative path to the webapp folder.
     * @returns True if the project contains TypeScript source files.
     */
    private static async detectTypeScriptApp(fs: Editor, rootPath: string, webappPath: string): Promise<boolean> {
        const webappFullPath = join(rootPath, webappPath);

        // Try getAppProgrammingLanguage first (needs tsconfig.json and package.json)
        let isTypeScript = false;
        try {
            isTypeScript = (await getAppProgrammingLanguage(rootPath)) === 'TypeScript';
        } catch (error: unknown) {
            // Expected: getAppProgrammingLanguage may fail for legacy projects without package.json
            // Will fall back to scanning for .ts files below
        }

        if (isTypeScript) {
            return true;
        }

        return ProjectMigrator.webappHasTypeScriptFile(fs, webappFullPath);
    }

    /**
     * Scans the webapp folder for a TypeScript source file (.ts, excluding .d.ts).
     * The migration tree is loaded into the mem-fs store, so the staged files are scanned.
     *
     * @param fs - The mem-fs editor.
     * @param webappFullPath - Absolute path to the webapp folder.
     * @returns True if a non-declaration .ts file is present under the webapp folder.
     */
    private static webappHasTypeScriptFile(fs: Editor, webappFullPath: string): boolean {
        const isTypeScriptFile = (filePath: string): boolean => filePath.endsWith('.ts') && !filePath.endsWith('.d.ts');

        if (!hasStore(fs)) {
            return false;
        }
        // Scan staged files under the webapp folder (paths use forward slashes)
        const normalizedPrefix = webappFullPath.replaceAll('\\', '/').replace(/\/?$/, '/');
        let found = false;
        fs.store.each((file) => {
            if (file.state === 'deleted') {
                return;
            }
            const normalizedFilePath = file.path.replaceAll('\\', '/');
            if (normalizedFilePath.startsWith(normalizedPrefix) && isTypeScriptFile(normalizedFilePath)) {
                found = true;
            }
        });
        return found;
    }
}
