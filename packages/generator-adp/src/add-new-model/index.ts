import { MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import type { NewModelAnswers, NewModelData, DescriptorVariant } from '@sap-ux/adp-tooling';
import { generateChange, ChangeType, getPromptsForNewModel, getVariant } from '@sap-ux/adp-tooling';

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

        try {
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

    async prompting(): Promise<void> {
        if (this.validationError) {
            await this.handleRuntimeCrash(this.validationError.message);
            return;
        }

        this.answers = await this.prompt(getPromptsForNewModel(this.projectPath, this.variant.layer));
        this.logger.log(`Current answers\n${JSON.stringify(this.answers, null, 2)}`);
    }

    async writing(): Promise<void> {
        await generateChange<ChangeType.ADD_NEW_MODEL>(
            this.projectPath,
            ChangeType.ADD_NEW_MODEL,
            this._createNewModelData(),
            this.fs
        );
        this.logger.log('Change written to changes folder');
    }

    end(): void {
        this.logger.log('Successfully created change!');
    }

    /**
     * Creates the new model data.
     *
     * @returns {NewModelData} The new model data.
     */
    private _createNewModelData(): NewModelData {
        const { name, uri, modelName, version, modelSettings, addAnnotationMode } = this.answers;
        return {
            variant: this.variant,
            service: {
                name,
                uri,
                modelName,
                version,
                modelSettings
            },
            ...(addAnnotationMode && {
                annotation: {
                    dataSourceName: this.answers.dataSourceName,
                    dataSourceURI: this.answers.dataSourceURI,
                    settings: this.answers.annotationSettings
                }
            })
        };
    }
}

export = AddNewModelGenerator;
