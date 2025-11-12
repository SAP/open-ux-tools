import Generator from 'yeoman-generator';
import RepoAppDownloadLogger from '../utils/logger';
import { AppWizard, Prompts, MessageType } from '@sap-devx/yeoman-ui-types';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { Logger } from '@sap-ux/logger';
import { generatorTitle, extractedFilePath, generatorName, defaultAnswers, qfaJsonFileName } from '../utils/constants';
import { t } from '../utils/i18n';
import { extractZip } from '../utils/download-utils';
import { EventName } from '../telemetryEvents';
import {
    getDefaultTargetFolder,
    generateAppGenInfo,
    type AppGenInfo,
    type YeomanEnvironment,
    sendTelemetry,
    TelemetryHelper,
    isCli
} from '@sap-ux/fiori-generator-shared';
import type { RepoAppDownloadOptions, RepoAppDownloadAnswers, RepoAppDownloadQuestions, QfaJsonConfig } from './types';
import { getPrompts } from '../prompts/prompts';
import { generate, TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { join, basename } from 'node:path';
import { platform } from 'node:os';
import { runPostAppGenHook } from '../utils/event-hook';
import { getDefaultUI5Theme } from '@sap-ux/ui5-info';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig, updateWorkspaceFoldersIfNeeded, handleWorkspaceConfig } from '@sap-ux/launch-config';
import { isAppStudio } from '@sap-ux/btp-utils';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { writeApplicationInfoSettings } from '@sap-ux/fiori-tools-settings';
import { generate as generateDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { PromptState } from '../prompts/prompt-state';
import { PromptNames } from './types';
import { getAbapDeployConfig, getAppConfig, type AppDownloadContext } from './app-config';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import { makeValidJson } from '../utils/file-helpers';
import { replaceWebappFiles, validateAndUpdateManifestUI5Version } from '../utils/updates';
import { getYUIDetails } from '../prompts/prompt-helpers';
import { isValidPromptState, validateQfaJsonFile } from '../utils/validators';
import { FileName, DirName } from '@sap-ux/project-access';

/**
 * Generator class for downloading a basic app from a repository.
 * This class handles the process of app selection, downloading the app and generating a fiori app from the downloaded app
 */
export default class extends Generator {
    private readonly appWizard: AppWizard;
    private readonly vscode?: any;
    private readonly appRootPath: string;
    private readonly prompts: Prompts;
    private readonly answers: RepoAppDownloadAnswers = defaultAnswers;
    public options: RepoAppDownloadOptions;
    private projectPath: string;
    private extractedProjectPath: string;
    private debugOptions: DebugOptions;
    setPromptsCallback: (fn: object) => void;

    /**
     * Constructor for Downloading App.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: RepoAppDownloadOptions) {
        super(args, opts);

        // Initialise properties from options
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.appRootPath = opts?.appRootPath ?? getDefaultTargetFolder(this.vscode) ?? this.destinationRoot();
        this.options = opts;

        // Configure logging
        RepoAppDownloadLogger.configureLogging(
            this.rootGeneratorName(),
            this.log,
            this.options.logWrapper,
            this.options.logLevel,
            this.options.logger,
            this.vscode
        );

        // Initialise prompts and callbacks if not launched as a subgenerator
        this.appWizard.setHeaderTitle(generatorTitle);
        this.prompts = new Prompts(getYUIDetails());
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    /**
     * Initialises necessary settings and telemetry for the generator.
     */
    public async initializing(): Promise<void> {
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }
        // Initialise telemetry settings
        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: generatorName,
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    /**
     * Prompts the user for application details and downloads the app.
     */
    public async prompting(): Promise<void> {
        const quickDeployedAppConfig = this.options?.data?.quickDeployedAppConfig;
        const questions: RepoAppDownloadQuestions[] = await getPrompts(
            this.appRootPath,
            quickDeployedAppConfig,
            this.appWizard,
            isCli()
        );
        const answers: RepoAppDownloadAnswers = await this.prompt(questions);
        const { targetFolder } = answers;
        if (quickDeployedAppConfig?.appId) {
            // Handle quick deployed app download where prompts for system selection and app selection are not displayed
            // Only target folder prompt is shown
            this.answers.targetFolder = targetFolder;
            this.answers.systemSelection = PromptState.systemSelection;
            this.answers.selectedApp = answers.selectedApp;
        } else {
            // Handle app download where prompts for system selection and app selection are shown
            Object.assign(this.answers, answers);
        }
        if (isValidPromptState(this.answers.targetFolder, this.answers.selectedApp.appId)) {
            this.projectPath = join(this.answers.targetFolder, this.answers.selectedApp.appId);
            this.extractedProjectPath = join(this.projectPath, extractedFilePath);
        }
    }

    /**
     * Writes the configuration files for the project, including deployment config, and README.
     */
    public async writing(): Promise<void> {
        await extractZip(this.extractedProjectPath, this.fs);
        // Check if the qfa.json file
        const qfaJsonFilePath = join(this.extractedProjectPath, qfaJsonFileName);
        const qfaJson: QfaJsonConfig = makeValidJson(qfaJsonFilePath, this.fs);
        // Generate project files
        validateQfaJsonFile(qfaJson);
        const context: AppDownloadContext = {
            qfaJson
        };

        // Generate app config
        const config = await getAppConfig(
            this.answers.selectedApp,
            this.extractedProjectPath,
            context,
            this.answers.systemSelection,
            this.fs
        );
        await generate(this.projectPath, config, this.fs);

        // Generate deploy config
        const deployConfig: AbapDeployConfig = await getAbapDeployConfig(context);
        await generateDeployConfig(this.projectPath, deployConfig, undefined, this.fs);

        if (this.vscode) {
            // Generate Fiori launch config
            const fioriOptions = this._getLaunchConfig(config);
            // Create launch configuration
            await createLaunchConfig(
                this.projectPath,
                fioriOptions,
                this.fs,
                RepoAppDownloadLogger.logger as unknown as Logger
            );
            writeApplicationInfoSettings(this.projectPath);
        }

        // Generate README
        const readMeConfig = this._getReadMeConfig(config);
        generateAppGenInfo(this.projectPath, readMeConfig, this.fs);

        // Replace webapp files with downloaded app files
        await replaceWebappFiles(this.projectPath, this.extractedProjectPath, this.fs);

        await validateAndUpdateManifestUI5Version(join(this.projectPath, DirName.Webapp, FileName.Manifest), this.fs);
        // Clean up extracted project files
        this.fs.delete(this.extractedProjectPath);
    }

    /**
     * Returns the configuration for the README file.
     *
     * @param config - The app configuration object.
     * @returns {AppGenInfo} The configuration for generating the README.
     */
    private _getReadMeConfig(config: FioriElementsApp<LROPSettings>): AppGenInfo {
        const readMeConfig: AppGenInfo = {
            appName: config.app.id,
            appTitle: config.app.title ?? '',
            appNamespace: config.app.id.substring(0, config.app.id.lastIndexOf('.')),
            appDescription: t('readMe.appDescription'),
            ui5Theme: getDefaultUI5Theme(config.ui5?.version),
            generatorName: generatorName,
            generatorVersion: this.rootGeneratorVersion(),
            ui5Version: config.ui5?.version ?? '',
            template: TemplateType.ListReportObjectPage,
            serviceUrl: config.service.url,
            launchText: t('readMe.launchText')
        };
        return readMeConfig;
    }

    /**
     * Returns the configuration for launching the app with Fiori options.
     *
     * @param config - The app configuration object.
     * @returns {FioriOptions} The launch configuration options.
     */
    private _getLaunchConfig(config: FioriElementsApp<LROPSettings>): FioriOptions {
        const debugOptions: DebugOptions = {
            vscode: this.vscode,
            addStartCmd: true,
            sapClientParam: PromptState.sapClient,
            flpAppId: config.app.flpAppId ?? config.app.id,
            flpSandboxAvailable: true,
            isAppStudio: isAppStudio(),
            odataVersion: config.service.version === OdataVersion.v2 ? '2.0' : '4.0'
        };
        this.debugOptions = debugOptions;
        const fioriOptions: FioriOptions = {
            name: config.app.id,
            projectRoot: this.projectPath,
            /**
             * The `enableVSCodeReload` property is set to `false` to prevent automatic reloading of the VS Code workspace
             * after the app generation process. This is necessary to ensure that the `.vscode/launch-config.json` file is
             * written to disk before the workspace reload occurs. See {@link _handlePostAppGeneration} for details.
             */
            enableVSCodeReload: false,
            debugOptions
        };
        return fioriOptions;
    }

    /**
     * Installs npm dependencies for the project.
     */
    public async install(): Promise<void> {
        if (!this.options.skipInstall) {
            try {
                RepoAppDownloadLogger.logger?.debug('Running npm install...');
                await this._runNpmInstall(this.projectPath);
                RepoAppDownloadLogger.logger?.debug('npm install completed successfully.');
            } catch (error) {
                RepoAppDownloadLogger.logger?.error(t('error.installationErrors.npmInstall', { error }));
            }
        } else {
            RepoAppDownloadLogger.logger?.info(t('info.installationErrors.skippedInstallation'));
        }
    }

    /**
     * Runs npm install in the specified path.
     *
     * @param path - The path to run npm install.
     */
    private async _runNpmInstall(path: string): Promise<void> {
        const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';
        // install dependencies
        await this.spawnCommand(
            npm,
            ['install', '--no-audit', '--no-fund', '--silent', '--prefer-offline', '--no-progress'],
            {
                cwd: path
            }
        );
    }

    /**
     * Responsible for updating workspace folders and running post-generation commands if defined.
     */
    private async _handlePostAppGeneration(): Promise<void> {
        /**
         * `enableVSCodeReload` is set to false when generating launch config here {@link _getLaunchConfig}.
         * This prevents issues where the `.vscode/launch-config.json` file may not be written to disk due to the timing of mem-fs commits.
         *
         * In Yeoman, a commit occurs between the writing phase and the end phase. If no workspace is open in VS Code and the generated
         * app is added to the workspace, VS Code automatically reloads the window. However, by this point in the end phase, the in-memory file system
         * (mem-fs) has written all files except for `.vscode/launch-config.json`, because the commit happens before the end phase
         * causing it to be missed when the workspace reload occurs.
         *
         * Workflow:
         * 1. **Workspace URI**: The `updateWorkspaceFolders` object is created with the project folder's path, the project name,
         *    and the VS Code instance to handle workspace folder updates.
         * 2. **Update Workspace Folders**: The `updateWorkspaceFoldersIfNeeded` function is called to update the workspace folders,
         *    if necessary. See {@link updateWorkspaceFoldersIfNeeded} for details.
         * 3. **Run Post-Generation Commands**: If defined, post-generation commands from `options.data?.postGenCommands` are executed
         *    using the `runPostAppGenHook` function. This allows for additional setup or configuration tasks to be performed after
         *    the app generation process.
         */
        if (this.vscode) {
            const rootFolder = this.projectPath;
            // Create workspace folder URI
            const { workspaceFolderUri } = handleWorkspaceConfig(rootFolder, this.debugOptions);
            const updateWorkspaceFolders = workspaceFolderUri
                ? {
                      uri: workspaceFolderUri,
                      projectName: basename(rootFolder),
                      vscode: this.debugOptions.vscode
                  }
                : undefined;
            updateWorkspaceFoldersIfNeeded(updateWorkspaceFolders);
        }
        if (this.options.data?.postGenCommand) {
            await runPostAppGenHook({
                path: this.projectPath,
                vscodeInstance: this.vscode,
                postGenCommand: this.options.data?.postGenCommand
            });
        }
    }

    /**
     * Finalises the generator process by creating launch configurations and running post-generation hooks.
     */
    async end(): Promise<void> {
        try {
            this.appWizard.showInformation(t('info.repoAppDownloadCompleteMsg'), MessageType.notification);
            await this._handlePostAppGeneration();
            await sendTelemetry(
                EventName.GENERATION_SUCCESS,
                TelemetryHelper.createTelemetryData({
                    appType: 'repo-app-import-sub-generator',
                    ...this.options.telemetryData
                }) ?? {}
            ).catch((error) => {
                RepoAppDownloadLogger.logger?.error(t('error.telemetry', { error: error.message }));
            });
        } catch (error) {
            RepoAppDownloadLogger.logger?.error(t('error.endPhase', { error: error.message }));
        }
    }
}

export { PromptNames };
export type { RepoAppDownloadOptions };
