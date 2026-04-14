import { MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import type { NewModelAnswers, DescriptorVariant, CfConfig } from '@sap-ux/adp-tooling';
import {
    generateChange,
    ChangeType,
    getPromptsForNewModel,
    getVariant,
    createNewModelData,
    isCFEnvironment,
    isLoggedInCf,
    loadCfConfig,
    extractCfBuildTask,
    readUi5Config
} from '@sap-ux/adp-tooling';
import { setYeomanEnvConflicterForce } from '@sap-ux/fiori-generator-shared';

import { GeneratorTypes } from '../types';
import { initI18n, t } from '../utils/i18n';
import type { GeneratorOpts } from '../utils/opts';
import SubGeneratorBase from '../base/sub-gen-base';

/**
 * Generator for adding a new model to an OData service.
 */
class AddNewModelGenerator extends SubGeneratorBase {
    /**
     * The answers from the prompts.
     */
    private answers: NewModelAnswers;
    /**
     * The variant.
     */
    private variant: DescriptorVariant;
    /**
     * The CF configuration, set when running in a CF environment.
     */
    private cfConfig: CfConfig | undefined;
    /**
     * The project path.
     */
    private readonly projectPath: string;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {GeneratorOpts} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: GeneratorOpts) {
        super(args, opts, GeneratorTypes.ADD_NEW_MODEL);
        if (opts.data) {
            this.projectPath = opts.data.path;
        }
    }

    async initializing(): Promise<void> {
        await initI18n();
        setYeomanEnvConflicterForce(this.env, true);

        try {
            if (await isCFEnvironment(this.projectPath)) {
                this.cfConfig = loadCfConfig(this.logger);
                const loggedIn = await isLoggedInCf(this.cfConfig, this.logger);
                if (!loggedIn) {
                    throw new Error(t('error.cfNotLoggedIn'));
                }
                await this._checkCfTargetMismatch();
            }

            this._registerPrompts(
                new Prompts([
                    { name: t('yuiNavSteps.addNewModelName'), description: t('yuiNavSteps.addNewModelDescr') }
                ])
            );

            this.variant = await getVariant(this.projectPath);
        } catch (e) {
            this.appWizard.showError(e.message, MessageType.notification);
            this.validationError = e as Error;
            this.logger.error(e);
        }
    }

    /**
     * Checks whether the project's CF target (org/space stored in ui5.yaml) matches the
     * currently logged-in CF target.
     */
    private async _checkCfTargetMismatch(): Promise<void> {
        let buildTask;
        try {
            const ui5Config = await readUi5Config(this.projectPath, 'ui5.yaml');
            buildTask = extractCfBuildTask(ui5Config);
        } catch (e) {
            this.logger.error((e as Error).message);
            throw new Error('CF target mismatch check failed. Check the logs for details.');
        }

        const orgMismatch = this.cfConfig?.org.GUID !== buildTask.org;
        const spaceMismatch = this.cfConfig?.space.GUID !== buildTask.space;

        if (orgMismatch || spaceMismatch) {
            throw new Error(t('error.cfTargetMismatch'));
        }
    }

    async prompting(): Promise<void> {
        if (this.validationError) {
            await this.handleRuntimeCrash(this.validationError.message);
            return;
        }

        this.answers = await this.prompt(
            await getPromptsForNewModel(this.projectPath, this.variant.layer, this.logger)
        );
        this.logger.log(`Current answers\n${JSON.stringify(this.answers, null, 2)}`);
    }

    async writing(): Promise<void> {
        await generateChange<ChangeType.ADD_NEW_MODEL>(
            this.projectPath,
            ChangeType.ADD_NEW_MODEL,
            await createNewModelData(this.projectPath, this.variant, this.answers, this.logger),
            this.fs
        );
        this.logger.log('Change written to changes folder');
    }

    end(): void {
        this.logger.log('Successfully created change!');
    }
}

export = AddNewModelGenerator;
