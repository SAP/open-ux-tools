import Generator from 'yeoman-generator';
import BspAppDownloadLogger from '../utils/logger';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { Logger } from '@sap-ux/logger';
import { sendTelemetry, TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import { generatorTitle, extractedFilePath, generatorName } from '../utils/constants';
import { t } from '../utils/i18n';
import { getYUIDetails, downloadApp } from '../utils/utils';
import { EventName } from '../telemetryEvents';
import type { YeomanEnvironment, VSCodeInstance } from '@sap-ux/fiori-generator-shared';
import { getDefaultTargetFolder } from '@sap-ux/fiori-generator-shared';
import type { BspAppDownloadOptions, BspAppDownloadAnswers } from './types';
import { promptNames } from '@sap-ux/odata-service-inquirer';
import { getQuestions } from '../prompts/prompts';
import { generate, TemplateType, type FioriElementsApp, type LROPSettings } from '@sap-ux/fiori-elements-writer';
import { getAppConfig } from '../utils/app-config';
import { join } from 'path';
import { platform } from 'os';
import { generateReadMe, type ReadMe } from '@sap-ux/fiori-generator-shared';
import { runPostAppGenHook } from '../utils/eventHook';
import { getDefaultUI5Theme } from '@sap-ux/ui5-info';
import type { DebugOptions, FioriOptions } from '@sap-ux/launch-config';
import { createLaunchConfig } from '@sap-ux/launch-config';
import { isAppStudio } from '@sap-ux/btp-utils';
import { OdataVersion } from '@sap-ux/odata-service-inquirer';
import { writeApplicationInfoSettings } from '@sap-ux/fiori-tools-settings';
import { generate as generateDeployConfig } from '@sap-ux/abap-deploy-config-writer';
import { PromptState } from '../prompts/prompt-state';

export default class extends Generator {
    private readonly appWizard: AppWizard;
    private readonly vscode?: VSCodeInstance;
    private readonly launchAppDownloaderAsSubGenerator: boolean;
    private readonly appRootPath: string;
    private readonly prompts: Prompts;
    private answers: BspAppDownloadAnswers = {
        selectedApp: {
            appId: '',
            title: '',
            description: '',
            repoName: '',
            url: ''
        },
        targetFolder: '',
        [promptNames.systemSelection]: {}
    };
    public options: BspAppDownloadOptions;
    private fioriOptions: FioriOptions;
    // re visit this
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

        this.appWizard = opts.appWizard ?? AppWizard.create(opts);
        this.vscode = opts.vscode;
        this.launchAppDownloaderAsSubGenerator = opts.launchAppDownloaderAsSubGenerator ?? false;
        this.appRootPath = opts?.appRootPath ?? getDefaultTargetFolder(this.vscode) ?? this.destinationRoot();
        this.options = opts;

        BspAppDownloadLogger.configureLogging(
            this.rootGeneratorName(),
            this.log,
            this.options.logWrapper,
            this.options.logLevel,
            this.options.logger,
            this.vscode
        );

        // If launched standalone, set the header, title and description
        if (!this.launchAppDownloaderAsSubGenerator) {
            this.appWizard.setHeaderTitle(generatorTitle);
            this.prompts = new Prompts(getYUIDetails());
            this.setPromptsCallback = (fn): void => {
                if (this.prompts) {
                    this.prompts.setCallback(fn);
                }
            };
        }
    }

    public async initializing(): Promise<void> {
        if ((this.env as unknown as YeomanEnvironment).conflicter) {
            (this.env as unknown as YeomanEnvironment).conflicter.force = this.options.force ?? true;
        }

        await TelemetryHelper.initTelemetrySettings({
            consumerModule: {
                name: generatorName,
                version: this.rootGeneratorVersion()
            },
            internalFeature: isInternalFeaturesSettingEnabled(),
            watchTelemetrySettingStore: false
        });
    }

    public async prompting(): Promise<void> {
        const questions = await getQuestions(this.appRootPath);
        const { selectedApp, targetFolder } = (await this.prompt(questions)) as BspAppDownloadAnswers;
        if (PromptState.systemSelection.connectedSystem?.serviceProvider && selectedApp?.appId && targetFolder) {
            // Object.assign(this.answers, {
            //     selectedApp,
            //     targetFolder,
            //     serviceProvider: PromptState.systemSelection.connectedSystem?.serviceProvider
            // });
            this.answers.selectedApp = selectedApp;
            this.answers.targetFolder = targetFolder;
            //this.answers.serviceProvider = PromptState.systemSelection.connectedSystem?.serviceProvider;

            this.projectPath = join(targetFolder, selectedApp.appId);
            this.extractedProjectPath = join(this.projectPath, extractedFilePath);
            // Trigger app download
            await downloadApp(
                this.answers,
                this.extractedProjectPath,
                this.fs,
                BspAppDownloadLogger.logger as unknown as Logger
            );
        }
    }

    public async writing(): Promise<void> {
        const config = await getAppConfig(
            this.answers,
            this.extractedProjectPath,
            this.fs,
            BspAppDownloadLogger.logger as unknown as Logger
        );
        await generate(this.projectPath, config, this.fs);
        await generateDeployConfig(
            this.projectPath,
            {
                // todo: get from json file
                target: {
                    url: `TEST_URL`,
                    destination: `TEST_DESTINATION`
                },
                app: {
                    name: this.answers.selectedApp.appId,
                    package: `TEST_PACKAGE`,
                    description: this.answers.selectedApp.description,
                    transport: `TEST_TRANSPORT_REQ`
                }
            },
            undefined,
            this.fs
        );
        const readMeConfig = this._getReadMeConfig(config);
        generateReadMe(this.projectPath, readMeConfig, this.fs);
        this.fioriOptions = this._getLaunchConfig(config);
        writeApplicationInfoSettings(this.projectPath);
    }

    /**
     *
     * @param config
     */
    private _getReadMeConfig(config: FioriElementsApp<LROPSettings>): ReadMe {
        const readMeConfig: ReadMe = {
            appName: config.app.id,
            appTitle: config.app.title ?? '',
            appNamespace: '', // todo: cant find namespace in manifest json - default?
            appDescription: t('readMe.appDescription'),
            ui5Theme: getDefaultUI5Theme(config.ui5?.version),
            generatorName: generatorName, // todo: check if this is correct
            generatorVersion: this.rootGeneratorVersion(),
            ui5Version: config.ui5?.version ?? '',
            template: TemplateType.ListReportObjectPage,
            serviceUrl: config.service.url,
            launchText: t('readMe.launchText')
        };
        return readMeConfig;
    }

    /**
     *
     * @param config
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
            debugOptions
        };
        return fioriOptions;
    }

    public async install(): Promise<void> {
        if (!this.options.skipInstall) {
            try {
                await this._runNpmInstall(this.projectPath);
            } catch (error) {
                BspAppDownloadLogger.logger?.error(t('error.npmInstall', { error }));
            }
        } else {
            BspAppDownloadLogger.logger?.info(t('info.skippedInstallation'));
        }
    }
    /**
     * Runs npm install in the specified path.
     *
     * @param path - the path to run npm install
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

    async end() {
        // sendTelemetry(
        //     EventName.GENERATION_SUCCESS,
        //     TelemetryHelper.createTelemetryData({
        //         appType: 'bsp-app-download-sub-generator',
        //         ...this.options.telemetryData
        //     }) ?? {}
        // ).catch((error) => {
        //     BspAppDownloadLogger.logger.error(t('error.telemetry', { error }));
        // });
        debugger;
        await createLaunchConfig(
            this.projectPath,
            this.fioriOptions,
            this.fs,
            BspAppDownloadLogger.logger as unknown as Logger
        );
        // delete extracted path before commiting the changes
        // this.fs.delete(this.extractedProjectPath);
        if (this.options.data?.postGenCommands) {
            await runPostAppGenHook({
                path: this.projectPath,
                vscodeInstance: this.vscode,
                postGenCommand: this.options.data?.postGenCommands
            });
        }
    }
}

export { promptNames };
export type { BspAppDownloadOptions };
