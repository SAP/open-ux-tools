import Generator from 'yeoman-generator';
import BspAppDownloadLogger from '../utils/logger';
import { AppWizard, Prompts, MessageType } from '@sap-devx/yeoman-ui-types';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { Logger } from '@sap-ux/logger';
import { sendTelemetry, TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import { generatorTitle, extractedFilePath, generatorName, defaultAnswers, qfaJsonFileName } from '../utils/constants';
import { t } from '../utils/i18n';
import { getYUIDetails } from '../prompts/prompt-helpers';
import { downloadApp } from '../utils/download-utils';
import { EventName } from '../telemetryEvents';
import type { YeomanEnvironment } from '@sap-ux/fiori-generator-shared';
import { getDefaultTargetFolder } from '@sap-ux/fiori-generator-shared';
import type {
    BspAppDownloadOptions,
    BspAppDownloadAnswers,
    BspAppDownloadQuestions,
    QfaJsonConfig,
    QuickDeployedAppConfig
} from './types';
import { getPrompts } from '../prompts/prompts';
import { generate, TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { join, basename } from 'path';
import { platform } from 'os';
import { generateReadMe, type ReadMe } from '@sap-ux/fiori-generator-shared';
import { runPostAppGenHook } from '../utils/event-hook';
import { getDefaultUI5Theme } from '@sap-ux/ui5-info';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig, updateWorkspaceFoldersIfNeeded } from '@sap-ux/launch-config';
import { isAppStudio } from '@sap-ux/btp-utils';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { writeApplicationInfoSettings } from '@sap-ux/fiori-tools-settings';
import { generate as generateDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { PromptState } from '../prompts/prompt-state';
import { PromptNames } from './types';
import { getAbapDeployConfig, getAppConfig } from './app-config';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import { replaceWebappFiles, makeValidJson } from '../utils/file-helpers';
import { fetchAppListForSelectedSystem, extractAppData } from '../prompts/prompt-helpers';
import { isValidPromptState, validateQfaJsonFile } from '../utils/validators';

/**
 * Generator class for downloading a basic app from BSP repository.
 * This class handles the process of app selection, downloading the app and generating a fiori app from the downloaded app
 */
export default class extends Generator {
    private readonly appWizard: AppWizard;
    private readonly vscode?: any;
    private readonly launchAppDownloaderAsSubGenerator: boolean;
    private readonly appRootPath: string;
    private readonly prompts: Prompts;
    private answers: BspAppDownloadAnswers = defaultAnswers;
    public options: BspAppDownloadOptions;
    private projectPath: string;
    private extractedProjectPath: string;
    setPromptsCallback: (fn: object) => void;

    /**
     * Constructor for Downloading App.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: BspAppDownloadOptions) {
        super(args, opts);

        // Initialise properties from options
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.launchAppDownloaderAsSubGenerator = opts.launchAppDownloaderAsSubGenerator ?? false;
        this.appRootPath = opts?.appRootPath ?? getDefaultTargetFolder(this.vscode) ?? this.destinationRoot();
        this.options = opts;

        // Configure logging
        BspAppDownloadLogger.configureLogging(
            this.rootGeneratorName(),
            this.log,
            this.options.logWrapper,
            this.options.logLevel,
            this.options.logger,
            this.vscode
        );

        this.prompts = new Prompts([]);
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
        const questions: BspAppDownloadQuestions[] = await getPrompts(this.appRootPath, quickDeployedAppConfig);
        const answers: BspAppDownloadAnswers = await this.prompt(questions);
        const { targetFolder } = answers;
        if (quickDeployedAppConfig?.appId) {
            // Handle quick deployed app download where prompts for system selection and app selection are not displayed
            // Only target folder prompt is shown
            await this._handleQuickDeployedAppDownload(quickDeployedAppConfig, targetFolder);
        } else {
            // Handle app download where prompts for system selection and app selection are shown
            Object.assign(this.answers, answers);
        }
    }

    /**
     *
     * @param quickDeployedAppConfig - The configuration for the quick deployed app.
     * @param targetFolder - The target folder where the app will be downloaded.
     */
    private async _handleQuickDeployedAppDownload(
        quickDeployedAppConfig: QuickDeployedAppConfig,
        targetFolder: string
    ): Promise<void> {
        console.log('quickDeployedAppConfig---', quickDeployedAppConfig, '--');
        const appList = await fetchAppListForSelectedSystem(
            quickDeployedAppConfig.serviceProvider,
            quickDeployedAppConfig.appId
        );
        if (!appList.length) {
            BspAppDownloadLogger.logger?.error(
                t('error.quickDeployedAppDownloadErrors.noAppsFound', { appId: quickDeployedAppConfig.appId })
            );
            throw new Error();
        }
        console.log('appList---', appList, '--');
        this.answers.selectedApp = extractAppData(appList[0]).value;
        this.answers.targetFolder = targetFolder;
        this.answers.systemSelection = PromptState.systemSelection;
    }

    /**
     * Writes the configuration files for the project, including deployment config, and README.
     */
    public async writing(): Promise<void> {
        if (isValidPromptState(this.answers.targetFolder, this.answers.selectedApp.appId)) {
            this.projectPath = join(this.answers.targetFolder, this.answers.selectedApp.appId);
            this.extractedProjectPath = join(this.projectPath, extractedFilePath);
            // Trigger app download
            await downloadApp(this.answers.selectedApp.repoName, this.extractedProjectPath, this.fs);
        }

        const qfaJsonFilePath = join(this.extractedProjectPath, qfaJsonFileName);
        if (this.fs.exists(qfaJsonFilePath)) {
            const qfaJson: QfaJsonConfig = makeValidJson(qfaJsonFilePath, this.fs);
            // Generate project files
            validateQfaJsonFile(qfaJson);

            // Generate app config
            const config = await getAppConfig(this.answers.selectedApp, this.extractedProjectPath, qfaJson, this.fs);
            await generate(this.projectPath, config, this.fs);

            // Generate deploy config
            const deployConfig: AbapDeployConfig = getAbapDeployConfig(this.answers.selectedApp, qfaJson);
            await generateDeployConfig(this.projectPath, deployConfig, undefined, this.fs);

            // Generate README
            const readMeConfig = this._getReadMeConfig(config);
            generateReadMe(this.projectPath, readMeConfig, this.fs);

            if (this.vscode) {
                // Generate Fiori launch config
                const fioriOptions = this._getLaunchConfig(config);
                // Create launch configuration
                await createLaunchConfig(
                    this.projectPath,
                    fioriOptions,
                    this.fs,
                    BspAppDownloadLogger.logger as unknown as Logger
                );
                writeApplicationInfoSettings(this.projectPath, this.fs);
            }
            // Replace webapp files with downloaded app files
            await replaceWebappFiles(this.projectPath, this.extractedProjectPath, this.fs);
            // Clean up extracted project files
            this.fs.delete(this.extractedProjectPath);
        } else {
            BspAppDownloadLogger.logger?.error(t('error.qfaJsonNotFound', { jsonFileName: qfaJsonFileName }));
        }
    }

    /**
     * Returns the configuration for the README file.
     *
     * @param config - The app configuration object.
     * @returns {ReadMe} The configuration for generating the README.
     */
    private _getReadMeConfig(config: FioriElementsApp<LROPSettings>): ReadMe {
        const readMeConfig: ReadMe = {
            appName: config.app.id,
            appTitle: config.app.title ?? '',
            appNamespace: '', // todo: cant find namespace in manifest json - default?
            appDescription: t('readMe.appDescription'),
            ui5Theme: getDefaultUI5Theme(config.ui5?.version),
            generatorName: generatorName, // todo: check if this name is okay ?
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
            sapClientParam: '', // todo: check if sap-client info is available
            flpAppId: config.app.flpAppId ?? config.app.id,
            flpSandboxAvailable: true,
            isAppStudio: isAppStudio(),
            odataVersion: config.service.version === OdataVersion.v2 ? '2.0' : '4.0'
        };
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
                await this._runNpmInstall(this.projectPath);
            } catch (error) {
                BspAppDownloadLogger.logger?.error(t('error.installationErrors.npmInstall', { error }));
            }
        } else {
            BspAppDownloadLogger.logger?.info(t('info.installationErrors.skippedInstallation'));
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
            const updateWorkspaceFolders = {
                uri: this.vscode?.Uri?.file(join(this.projectPath)),
                projectName: basename(this.projectPath),
                vscode: this.vscode
            };
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
            this.appWizard.showInformation(t('info.bspAppDownloadCompleteMsg'), MessageType.notification);
            await sendTelemetry(
                EventName.GENERATION_SUCCESS,
                TelemetryHelper.createTelemetryData({
                    appType: 'bsp-app-download-sub-generator',
                    ...this.options.telemetryData
                }) ?? {}
            ).catch((error) => {
                BspAppDownloadLogger.logger?.error(t('error.telemetry', { error: error.message }));
            });
            await this._handlePostAppGeneration();
        } catch (error) {
            BspAppDownloadLogger.logger?.error(t('error.endPhase', { error: error.message }));
        }
    }
}

export { PromptNames };
export type { BspAppDownloadOptions };
