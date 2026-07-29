import { FioriElementsVersion, FileName } from './project-spec-types.js';
import { determineMessage, readFile, updateFile } from './utils/index.js';
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
import { commitFileSystemChanges, copyAdaptationFiles, copyLibraryFiles } from './files/index.js';

// Template functions
import { assembleTemplateData } from './template/index.js';

// Project functions
import { loadOrFetchProjectInfo, validateProjectForMigration } from './project/index.js';

// Data functions
import { resolveUI5VersionsForMigration } from './data/index.js';

import type { ImportProjectInfo, Message } from './types.js';
import { MigrationTypes } from './utils/constants.js';
import type { Editor } from 'mem-fs-editor';
import { i18nText } from './i18n.js';

export class ProjectMigrator {
    static fs: Editor | undefined;
    /**
     * migrate project
     *
     * @param projectRoot
     * @param baseUri
     * @param ui5SnapshotUrl
     * @param importProjectInfo
     * @param vscode
     * @param internalToggle
     */
    public static async migrate(
        projectRoot: string,
        baseUri: string,
        ui5SnapshotUrl: string,
        importProjectInfo?: ImportProjectInfo,
        vscode?: any,
        internalToggle: boolean = false
    ): Promise<{ result: boolean; messages: Message[] }> {
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
            projectInfo.localUI5Version = ui5Versions?.[0].version;

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
                    internalToggle
                );
                messages = messages.concat(copyMessages);
                result = isSuccess;
            } else if (projectInfo.uiAdaptation) {
                const { messages: copyMessages, result: isSuccess } = await this.copyAdaptationFiles(
                    projectInfo,
                    ui5SnapshotUrl
                );
                messages = messages.concat(copyMessages);
                result = isSuccess;
            } else if (projectInfo.type === MigrationTypes.library) {
                const { messages: copyMessages, result: isSuccess } = await this.copyLibraryFiles(projectInfo);
                messages = messages.concat(copyMessages);
                result = isSuccess;
            } else {
                messages.push({ type: 'ERROR', description: i18nText('ERROR_FAILED_TO_GET_PROJECT_INFO') });
            }
        } catch (e) {
            messages.push({
                type: 'ERROR',
                description: `Error during migration: ${determineMessage(e, undefined, e.useMessage)}`
            });
        }
        return { result, messages };
    }

    /**
     * Copy files from templates into the project
     * Orchestrates the migration process through distinct phases
     *
     * @param projectInfo - Project information
     * @param vscode - VS Code context
     * @param ui5SnapshotUrl - UI5 snapshot URL
     * @param internalToggle - Internal feature toggle
     * @returns Migration result with status and messages
     */
    private static async copyCommonFiles(
        projectInfo: ImportProjectInfo,
        vscode: any,
        ui5SnapshotUrl: string,
        internalToggle: boolean = false
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
                firstNeoAppDestination
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
                messages
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

    private static async commit() {
        return commitFileSystemChanges(this.fs);
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
    ): Promise<{ result: boolean; messages: Message[] }> {
        return copyAdaptationFiles(projectInfo, snapshotUrl, this.fs);
    }

    /**
     * Copy files from templates into the project
     *
     * @param projectInfo
     */
    private static async copyLibraryFiles(
        projectInfo: ImportProjectInfo
    ): Promise<{ result: boolean; messages: Message[] }> {
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
            const fsEditor = await enableTypescript(rootPath);
            await new Promise<void>((resolve) => {
                fsEditor.commit((err) => {
                    if (err) {
                        messages.push({
                            type: 'ERROR',
                            description: `Error committing TypeScript setup: ${err}`
                        });
                    }
                    resolve();
                });
            });
        } catch (err) {
            messages.push({
                type: 'ERROR',
                description: `Error enabling TypeScript: ${err instanceof Error ? err.message : String(err)}`
            });
            return messages;
        }
        for (const yamlName of [FileName.Ui5LocalYaml, FileName.Ui5MockYaml]) {
            const yamlPath = join(rootPath, yamlName);
            if (existsSync(yamlPath)) {
                const yamlConfig = await UI5Config.newInstance(await readFile(yamlPath));
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
