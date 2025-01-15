import { join } from 'path';
import hasbin = require('hasbin');
import { platform } from 'os';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import {
    DeploymentGenerator,
    ErrorMessages,
    mtaExecutable,
    handleErrorMessage
} from '@sap-ux/deploy-config-generator-shared';
import { getAppRouterPrompts, appRouterPromptNames } from '@sap-ux/cf-deploy-config-inquirer';
import { CFBaseConfig, generateBaseConfig, RouterModuleType } from '@sap-ux/cf-deploy-config-writer';
import { t, initI18n } from '../utils';
import { defaultMtaVersion, generatorTitle, prompts } from './constants';
import type { Logger } from '@sap-ux/logger';
import type { CfApprouterGenOptions } from './types';
import type {
    CfAppRouterDeployConfigPromptOptions,
    CfAppRouterDeployConfigAnswers
} from '@sap-ux/cf-deploy-config-inquirer';

/**
 * Generator for creating an application router.
 *
 * @extends DeploymentGenerator
 */
export default class extends DeploymentGenerator {
    private readonly appWizard: AppWizard;
    private answers: CfAppRouterDeployConfigAnswers;
    private prompts: Prompts;
    private abort = false;

    setPromptsCallback: (fn: any) => void;

    /**
     * Constructor for the generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - cf app router options passed to the generator
     */
    constructor(args: string | string[], opts: CfApprouterGenOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard || AppWizard.create(opts);
        this.options = opts;

        this.appWizard.setHeaderTitle(generatorTitle);
        this.prompts = new Prompts(prompts);
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    public async initializing(): Promise<void> {
        await super.initializing();
        await initI18n();
        this._initFromProjectConfig();
    }

    private _initFromProjectConfig(): void {
        // mta executable is required as mta-lib is used
        if (!hasbin.sync(mtaExecutable)) {
            this.abort = true;
            handleErrorMessage(this.appWizard, ErrorMessages.noMtaBin);
        }
    }

    public async prompting(): Promise<void> {
        if (this.abort) {
            return;
        }

        // assign prompt options
        const appRouterPromptOptions: CfAppRouterDeployConfigPromptOptions = {
            [appRouterPromptNames.mtaPath]: this.destinationRoot() ?? process.cwd(),
            [appRouterPromptNames.mtaId]: true,
            [appRouterPromptNames.mtaDescription]: true,
            [appRouterPromptNames.mtaVersion]: false, // prompt switched off as we are writing the default - 0.0.1
            [appRouterPromptNames.routerType]: true,
            [appRouterPromptNames.addConnectivityService]: true,
            [appRouterPromptNames.addABAPServiceBinding]: true
        };

        const prompts = await getAppRouterPrompts(appRouterPromptOptions);
        this.answers = await this.prompt(prompts);
    }

    public async writing(): Promise<void> {
        if (this.abort) {
            return;
        }

        this.destinationRoot(join(this.answers.mtaPath, this.answers.mtaId));
        DeploymentGenerator.logger?.debug(
            t('appRouterGen.debug.projectPath', { destinationPath: this.destinationRoot() })
        );

        let abapServiceProvider: { abapServiceName?: string; abapService?: string } | undefined;
        if (this.answers.addABAPServiceBinding) {
            abapServiceProvider = {
                abapServiceName: this.answers.abapServiceProvider?.label,
                abapService: this.answers.abapServiceProvider?.service
            };
        }

        const cfBaseConfig = {
            routerType: this.answers.routerType as RouterModuleType,
            addConnectivityService: this.answers.addConnectivityService ?? false,
            abapServiceProvider,
            mtaId: this.answers.mtaId,
            mtaPath: this.destinationRoot(),
            mtaDescription: this.answers.mtaDescription,
            mtaVersion: defaultMtaVersion
        } satisfies CFBaseConfig;

        await generateBaseConfig(cfBaseConfig, this.fs, DeploymentGenerator.logger as unknown as Logger);
    }

    public install(): void {
        this._install();
    }

    private _install(): void {
        if (!this.options.skipInstall) {
            const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';

            // install dependencies in project root
            this.spawnCommand(
                npm,
                ['install', '--no-audit', '--no-fund', '--silent', '--prefer-offline', '--no-progress'],
                {
                    cwd: this.destinationRoot()
                }
            );
        }
    }
}

export { CfApprouterGenOptions };
