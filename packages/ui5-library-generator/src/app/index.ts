import Generator from 'yeoman-generator';
import { AppWizard } from '@sap-devx/yeoman-ui-types';
import { join } from 'path';
import ReuseLibGenLogger from '../utils/logger';
import { t } from '../utils';
import { platform } from 'os';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { ToolsLogger } from '@sap-ux/logger';
import { runPostLibGenHook } from '../utils/eventHook';
import {
    isCli,
    getDefaultTargetFolder,
    type YeomanEnvironment,
    type VSCodeInstance
} from '@sap-ux/fiori-generator-shared';
import { generate, type UI5LibConfig } from '@sap-ux/ui5-library-writer';
import { prompt, type UI5LibraryAnswers, type InquirerAdapter } from '@sap-ux/ui5-library-inquirer';

/**
 * Generator for creating a new UI5 library.
 *
 * @extends Generator
 */
export default class ReuseLibGen extends Generator {
    answers: UI5LibraryAnswers = {
        libraryName: '',
        namespace: '',
        targetFolder: '',
        ui5Version: '',
        enableTypescript: false
    };
    appWizard: AppWizard;
    targetFolder: string;
    vscode: unknown;
    projectPath: string;

    /**
     * Constructor for the generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - options passed to the generator
     */
    constructor(args: string | string[], opts: Generator.GeneratorOptions) {
        super(args, opts, {
            unique: 'namespace'
        });
        this.appWizard = opts.appWizard || AppWizard.create(opts);
        this.vscode = opts.vscode;
        ReuseLibGenLogger.logger = new ToolsLogger({ logPrefix: '@sap-ux/ui5-library-generator' });

        this.targetFolder = getDefaultTargetFolder(this.options.vscode) ?? process.cwd();
    }

    public async prompting(): Promise<void> {
        const promptCli = isCli();
        let inquirerAdaptor;
        if ((this.env as unknown as YeomanEnvironment)?.adapter?.actualAdapter) {
            inquirerAdaptor = (this.env as unknown as YeomanEnvironment).adapter.actualAdapter;
        } else {
            inquirerAdaptor = this.env?.adapter;
        }
        const answers = await prompt(
            {
                targetFolder: this.targetFolder,
                includeSeparators: !promptCli,
                useAutocomplete: promptCli
            },
            inquirerAdaptor as InquirerAdapter
        );
        Object.assign(this.answers, answers);
    }

    public async writing(): Promise<void> {
        const ui5Lib = {
            libraryName: this.answers.libraryName,
            namespace: this.answers.namespace,
            framework: 'SAPUI5',
            frameworkVersion: this.answers.ui5Version,
            author: 'Fiori tools',
            typescript: this.answers.enableTypescript
        } satisfies UI5LibConfig;

        try {
            await generate(this.answers.targetFolder, ui5Lib, this.fs);
        } catch (e) {
            ReuseLibGenLogger.logger.error(e);
            throw new Error(t('error.generatingUi5Lib'));
        }
    }

    async install(): Promise<void> {
        if (!this.options.skipInstall) {
            try {
                const runner = new CommandRunner();
                const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';

                ReuseLibGenLogger.logger.info(t('info.installingDependencies'));
                this.projectPath = join(
                    this.answers.targetFolder,
                    `${this.answers.namespace}.${this.answers.libraryName}`
                );
                await runner.run(npm, ['install'], { cwd: this.projectPath });
                ReuseLibGenLogger.logger.info(t('info.dependenciesInstalled'));
            } catch (error) {
                ReuseLibGenLogger.logger.error(error || t('error.unknown'));
            }
        }
    }

    async end(): Promise<void> {
        await runPostLibGenHook({
            path: this.projectPath,
            vscodeInstance: this.vscode as VSCodeInstance
        });
    }
}
