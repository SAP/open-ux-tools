import { MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import type { AddComponentUsageAnswers, ComponentUsagesData, DescriptorVariant } from '@sap-ux/adp-tooling';
import { ChangeType, generateChange, getPromptsForAddComponentUsages, getVariant } from '@sap-ux/adp-tooling';

import { GeneratorTypes } from '../types';
import { initI18n, t } from '../utils/i18n';
import type { GeneratorOpts } from '../utils/opts';
import SubGeneratorBase from '../base/sub-gen-base';

/**
 * Generator for adding component usages to a project.
 */
class AddComponentUsagesGenerator extends SubGeneratorBase {
    public setPromptsCallback: (fn: any) => void;
    private answers: AddComponentUsageAnswers;
    public prompts: Prompts;

    /**
     * The variant.
     */
    private variant: DescriptorVariant;
    /**
     * The project path.
     */
    protected readonly projectPath: string;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {GeneratorOpts} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: GeneratorOpts) {
        super(args, opts, GeneratorTypes.ADD_COMPONENT_USAGES);
        if (opts.data) {
            this.projectPath = opts.data.path;
        }
        this.prompts = new Prompts([]);
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };
    }

    async initializing(): Promise<void> {
        await initI18n();

        try {
            this.prompts = new Prompts([
                { name: t('yuiNavSteps.addComponentUsagesName'), description: t('yuiNavSteps.addComponentUsagesDescr') }
            ]);

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

        this.answers = await this.prompt(getPromptsForAddComponentUsages(this.projectPath, this.variant.layer));
        this.logger.log(`Current answers\n${JSON.stringify(this.answers, null, 2)}`);
    }

    async writing(): Promise<void> {
        await generateChange<ChangeType.ADD_COMPONENT_USAGES>(
            this.projectPath,
            ChangeType.ADD_COMPONENT_USAGES,
            this.createComponentUsageData(),
            this.fs
        );
        this.logger.log(`Changes written to changes folder`);
    }

    end(): void {
        this.logger.log('Successfully created change!');
    }

    /**
     * Creates the component usage data.
     *
     * @returns {ComponentUsagesData} The component usage data.
     */
    private createComponentUsageData(): ComponentUsagesData {
        const { usageId, data, settings, isLazy, name, shouldAddLibrary } = this.answers;

        return {
            variant: this.variant,
            component: {
                data,
                usageId,
                settings,
                isLazy,
                name
            },
            ...(shouldAddLibrary && {
                library: {
                    reference: this.answers.library,
                    referenceIsLazy: this.answers.libraryIsLazy
                }
            })
        };
    }
}

export = AddComponentUsagesGenerator;
