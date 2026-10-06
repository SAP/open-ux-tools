import { FioriElementsVersion, FileName } from './project-spec-types.js';
import { determineMessage, readFile, updateFile } from './utils/index.js';
import { createMemFsEditor, getCurrentEditor, runWithEditor } from './utils/fs-adapter.js';
import { commitFileSystemChanges } from './files/file-system.js';
import { ui5VersionRequestInfo } from '@sap-ux/ui5-info';
import { getAppProgrammingLanguage } from '@sap-ux/project-access';
import { enableTypescript, ui5TSSupport } from '@sap-ux/ui5-application-writer';
import { UI5Config } from '@sap-ux/ui5-config';
import { existsSync, readdirSync } from 'node:fs';
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
import { i18nText, initI18n } from './i18n.js';

export class ProjectMigrator {
    /**
     * Deprecated: Static fs property no longer used.
     * Each migration now uses its own isolated editor instance via AsyncLocalStorage context.
     *
     * @deprecated Set editor context using runWithEditor() instead
     */
    static fs: Editor | undefined;

    /**
     * migrate project
     *
     * @param projectRoot - Root path of the project to migrate
     * @param baseUri - Base URI for backend services
     * @param ui5SnapshotUrl - URL for UI5 snapshot version
     * @param importProjectInfo - Optional partial project information
     * @param vscode - Optional VS Code context
     * @param internalToggle - Enable internal features
     * @param fs - Optional mem-fs editor instance. If not provided, a new one will be created.
     * @param strict - Enable strict validation mode (WARNINGs become ERRORs for critical issues)
     * @returns Promise with fs editor, migration result, and messages
     */
    public static async migrate(
        projectRoot: string,
        baseUri: string,
        ui5SnapshotUrl: string,
        importProjectInfo?: Partial<ImportProjectInfo>,
        vscode?: any,
        internalToggle: boolean = false,
        fs?: Editor,
        strict: boolean = false
    ): Promise<{ fs: Editor; result: boolean; messages: Message[] }> {
        // Create a new isolated editor instance for this migration if not provided
        // This enables concurrent migrations without shared state corruption
        const ownsEditor = !fs;
        const editor = fs ?? createMemFsEditor();
        await initI18n();

        // Run migration within editor context so all functions have access to it
        const migrationResult = await runWithEditor(editor, async () => {
            let messages: Message[] = [];
            let result = false;

            try {
                // Load or fetch project information
                const { projectInfo, messages: projectInfoMessages } = await loadOrFetchProjectInfo(
                    projectRoot,
                    importProjectInfo
                );
                messages = messages.concat(projectInfoMessages);

                projectInfo.baseUri = baseUri;

                // Resolve UI5 versions for migration
                const ui5Versions = await resolveUI5VersionsForMigration(projectInfo, ui5SnapshotUrl);
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
                    messages.length === 0
                ) {
                    // V2 is supported
                    const { messages: copyMessages, result: isSuccess } = await this.copyCommonFiles(
                        projectInfo,
                        vscode,
                        ui5SnapshotUrl,
                        internalToggle,
                        strict
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
                    } = await this.copyAdaptationFiles(projectInfo, ui5SnapshotUrl);
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
                messages.push({
                    type: 'ERROR',
                    description: `Error during migration: ${determineMessage(error, undefined, useMessage)}`
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
        ui5SnapshotUrl: string,
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
        snapshotUrl: string
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
        for (const yamlName of [FileName.UI5LocalYaml, FileName.UI5MockYaml]) {
            const yamlPath = join(rootPath, yamlName);
            if (existsSync(yamlPath)) {
                // Optimize: read file first, then parse (avoids nested await)
                const yamlContent = await readFile(yamlPath);
                const yamlConfig = await UI5Config.newInstance(yamlContent);
                yamlConfig.addCustomMiddleware([ui5TSSupport.middleware]);
                yamlConfig.addCustomTasks([ui5TSSupport.task]);
                await updateFile(yamlPath, yamlConfig.toString());
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
        return (
            (await getAppProgrammingLanguage(rootPath)) === 'TypeScript' ||
            (existsSync(webappFullPath) &&
                readdirSync(webappFullPath, { recursive: true }).some(
                    (f) => typeof f === 'string' && f.endsWith('.ts') && !f.endsWith('.d.ts')
                ))
        );
    }
}
