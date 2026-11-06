import { join } from 'node:path';
import * as hasbin from 'hasbin';
import { platform } from 'node:os';
import { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import type { AppWizard as AppWizardType, Prompts as PromptsType } from '@sap-devx/yeoman-ui-types';
import type { PromptQuestions } from 'yeoman-generator';
import {
    DeploymentGenerator,
    ERROR_TYPE,
    handleErrorMessage,
    mtaExecutable
} from '@sap-ux/deploy-config-generator-shared';
import { getAppRouterPrompts, appRouterPromptNames } from '@sap-ux/cf-deploy-config-inquirer';
import { generateBaseConfig } from '@sap-ux/cf-deploy-config-writer';
import { t, initI18n } from '../utils/index.js';
import { defaultMtaVersion, generatorTitle, prompts } from './constants.js';
import type { Logger } from '@sap-ux/logger';
import type { CfApprouterGenOptions } from './types.js';
import type { CFBaseConfig, RouterModuleType } from '@sap-ux/cf-deploy-config-writer';
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
    declare options: CfApprouterGenOptions;
    private readonly appWizard: AppWizardType;
    private readonly prompts: PromptsType;
    private answers: CfAppRouterDeployConfigAnswers;
    private abort = false;

    setPromptsCallback: (fn: any) => void;

    /**
     * Constructor for the generator.
     *
     * @param args - arguments passed to the generator
     * @param opts - cf app router options passed to the generator
     */
    constructor(args: string[], opts: CfApprouterGenOptions) {
        super(args, opts);
        this.appWizard = opts.appWizard ?? AppWizard.create(opts);

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
            handleErrorMessage(this.appWizard, { errorType: ERROR_TYPE.NO_MTA_BIN });
            this.abort = true;
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
            [appRouterPromptNames.mtaVersion]: false, // prompt switched off as 0.0.1 is written by default
            [appRouterPromptNames.routerType]: true,
            [appRouterPromptNames.addConnectivityService]: true,
            [appRouterPromptNames.addABAPServiceBinding]: true
        };

        const prompts = await getAppRouterPrompts(appRouterPromptOptions);
        this.answers = await this.prompt(prompts as unknown as PromptQuestions<CfAppRouterDeployConfigAnswers>);
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

    public async install(): Promise<void> {
        await this._install();
    }

    private async _install(): Promise<void> {
        if (!this.abort && !this.options.skipInstall) {
            const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';

            // install dependencies in project root
            // yeoman v8 renamed the args-array form of `spawnCommand` to `spawn`
            await this.spawn(
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
