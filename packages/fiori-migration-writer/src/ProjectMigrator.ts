import { FioriElementsVersion, FileName } from './project-spec-types.js';
import { determineMessage, readFile, updateFile } from './utils/index.js';
import {
    createMemFsEditor,
    getCurrentEditor,
    runWithEditor,
    exists,
    loadProjectIntoEditor
} from './utils/fs-adapter.js';
import { commitFileSystemChanges } from './files/file-system.js';
import { ui5VersionRequestInfo } from '@sap-ux/ui5-info';
import { getAppProgrammingLanguage } from '@sap-ux/project-access';
import { enableTypescript, ui5TSSupport } from '@sap-ux/ui5-application-writer';
import { UI5Config } from '@sap-ux/ui5-config';
import { readdir } from 'node:fs/promises';
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
    /** Optional URL for UI5 snapshot version */
    ui5SnapshotUrl?: string;
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
     * Migrate a project.
     *
     * @param options - Migration options object
     * @returns Promise with fs editor, migration result, and messages
     */
    public static async migrate(
        options: MigrateOptions | string  // Accept string to detect old API usage
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        // Detect and reject old positional parameter API with helpful migration message
        if (typeof options === 'string') {
            throw new Error(
                'The positional parameter API has been removed in v0.0.4.\n' +
                'Please use the options object instead:\n\n' +
                'ProjectMigrator.migrate({\n' +
                `  projectRoot: "${options}",\n` +
                '  baseUri: "YOUR_BACKEND_URL",\n' +
                '  ui5SnapshotUrl: "YOUR_UI5_URL"  // optional\n' +
                '})\n\n' +
                'See README.md for updated examples.'
            );
        }

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

        // Run migration within editor context so all functions have access to it
        const migrationResult = await runWithEditor(editor, async () => {
            let messages: Message[] = [];
            let result = false;

            try {
                // Load the project tree into mem-fs so existence checks see untracked files
                // on disk and migration writes never silently overwrite them.
                await loadProjectIntoEditor(editor, projectRoot);

                // Load or fetch project information
                const { projectInfo, messages: projectInfoMessages } = await loadOrFetchProjectInfo(
                    projectRoot,
                    importProjectInfoOpt
                );
                messages = messages.concat(projectInfoMessages);

                projectInfo.baseUri = baseUriOpt;

                // Resolve UI5 versions for migration
                const ui5Versions = await resolveUI5VersionsForMigration(projectInfo, ui5SnapshotUrlOpt);
                projectInfo.localUI5Version = ui5Versions?.[0]?.version;
                if (/^(snapshot(-untested)?)?$/i.test(projectInfo.ui5Version?.trim() ?? '')) {
                    projectInfo.ui5Version = projectInfo.localUI5Version ?? '';
                }

                // Validate project is suitable for migration (not a Fiori app in CAP project)
                await validateProjectForMigration(projectRoot);

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
                        projectInfo,
                        vscodeOpt,
                        ui5SnapshotUrlOpt,
                        internalToggleOpt,
                        strictOpt
                    );
                    messages = messages.concat(copyMessages);
                    result = isSuccess;
                } else if (projectInfo.type === MigrationTypes.library) {
                    const {
                        fs: updatedFs,
                        messages: copyMessages,
                        result: isSuccess
                    } = await this.copyLibraryFiles(projectInfo);
                    messages = messages.concat(copyMessages);
                    result = isSuccess;
                    // Update editor to the one returned from copyLibraryFiles
                    return { fs: updatedFs, result, messages };
                } else if (projectInfo.uiAdaptation) {
                    const {
                        fs: updatedFs,
                        messages: copyMessages,
                        result: isSuccess
                    } = await this.copyAdaptationFiles(projectInfo, ui5SnapshotUrlOpt);
                    messages = messages.concat(copyMessages);
                    result = isSuccess;
                    // Update editor to the one returned from copyAdaptationFiles
                    return { fs: updatedFs, result, messages };
                } else {
                    messages.push({ type: 'ERROR', description: i18nText('ERROR_FAILED_TO_GET_PROJECT_INFO') });
                }
            } catch (e) {
                const error = e instanceof Error ? e : new Error(String(e));
                const useMessage =
                    typeof e === 'object' && e !== null && 'useMessage' in e ? Boolean(e.useMessage) : false;

                // Get error message from determineMessage, fallback to error.message if empty
                const errorMsg = determineMessage(error, undefined, useMessage) || error.message || 'Unknown error';

                messages.push({
                    type: 'ERROR',
                    description: `Error during migration: ${errorMsg}`
                });
            }

            // Return fs editor for caller to commit
            // This matches the pattern used by other open-ux-tools writers
            return { fs: editor, result, messages };
        });

        if (ownsEditor && migrationResult.result) {
            try {
                await commitFileSystemChanges(migrationResult.fs);
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
     * @param projectInfo - Project information
     * @param vscode - VS Code context
     * @param ui5SnapshotUrl - UI5 snapshot URL
     * @param internalToggle - Internal feature toggle
     * @param strict - Enable strict validation mode (WARNINGs become ERRORs for critical issues)
     * @returns Migration result with status and messages
     */
    private static async copyCommonFiles(
        projectInfo: ImportProjectInfo,
        vscode: any,
        ui5SnapshotUrl?: string,
        internalToggle: boolean = false,
        strict: boolean = false
    ): Promise<{ result: boolean; messages: Message[] }> {
        const messages: Message[] = [];
        const { isSAPApp = false, rootPath, destination, neoappDestinations, firstNeoAppDestination } = projectInfo;

        try {
            // Detect TypeScript project
            const isTypeScriptApp = await ProjectMigrator.detectTypeScriptApp(rootPath, projectInfo.webappPath);

            // Prepare configuration data
            const configData = await prepareConfigurationData(projectInfo, projectInfo.ui5Version, isTypeScriptApp);

            // Phase 1: Setup project structure
            const { webappPath, keepIndex } = await setupProjectStructure(projectInfo, rootPath);
            projectInfo.webappPath = webappPath;

            // Phase 2: Assemble template data
            const templateContext = await assembleTemplateData({
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
                const tsMessages = await ProjectMigrator.setupTypeScript(rootPath);
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
     * @param projectInfo
     * @param snapshotUrl
     */
    private static async copyAdaptationFiles(
        projectInfo: ImportProjectInfo,
        snapshotUrl?: string
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        return copyAdaptationFiles(projectInfo, snapshotUrl, undefined);
    }

    /**
     * Copy files from templates into the project
     *
     * @param projectInfo
     */
    private static async copyLibraryFiles(
        projectInfo: ImportProjectInfo
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        return copyLibraryFiles(projectInfo);
    }

    /**
     * Configures a downloaded TypeScript app for local development.
     * Generates tsconfig.json and TypeScript devDependencies via {@link enableTypescript},
     * then patches ui5-local.yaml and ui5-mock.yaml with the transpile middleware and task.
     *
     * @param rootPath - The project root path.
     * @returns Messages to surface to the user after setup.
     */
    private static async setupTypeScript(rootPath: string): Promise<Message[]> {
        const messages: Message[] = [];
        try {
            await enableTypescript(rootPath, getCurrentEditor());
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

            if (await exists(yamlPath)) {
                // NOSONAR - Only 2 files, acceptable sequential check
                // readFile and updateFile are sync mem-fs operations
                const yamlContent = readFile(yamlPath);

                const yamlConfig = await UI5Config.newInstance(yamlContent); // NOSONAR - Sequential YAML parsing required
                yamlConfig.addCustomMiddleware([ui5TSSupport.middleware]);
                yamlConfig.addCustomTasks([ui5TSSupport.task]);
                updateFile(yamlPath, yamlConfig.toString());
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
     * @param rootPath - The project root path.
     * @param webappPath - The relative path to the webapp folder.
     * @returns True if the project contains TypeScript source files.
     */
    private static async detectTypeScriptApp(rootPath: string, webappPath: string): Promise<boolean> {
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

        return ProjectMigrator.webappHasTypeScriptFile(webappFullPath);
    }

    /**
     * Scans the webapp folder for a TypeScript source file (.ts, excluding .d.ts).
     * During migration the downloaded files live in the uncommitted mem-fs editor, so when an
     * editor with a store is in context the mem-fs store is scanned; otherwise the real disk is read.
     *
     * @param webappFullPath - Absolute path to the webapp folder.
     * @returns True if a non-declaration .ts file is present under the webapp folder.
     */
    private static async webappHasTypeScriptFile(webappFullPath: string): Promise<boolean> {
        const isTypeScriptFile = (filePath: string): boolean => filePath.endsWith('.ts') && !filePath.endsWith('.d.ts');

        const editor = getCurrentEditor();
        if (editor && hasStore(editor)) {
            // mem-fs mode: scan staged files under the webapp folder (paths use forward slashes)
            const normalizedPrefix = webappFullPath.replaceAll('\\', '/').replace(/\/?$/, '/');
            let found = false;
            editor.store.each((file) => {
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

        // No editor context: scan the real filesystem
        if (!(await exists(webappFullPath))) {
            return false;
        }
        return (await readdir(webappFullPath, { recursive: true })).some(
            (f) => typeof f === 'string' && isTypeScriptFile(f)
        );
    }
}
