import { MessageType, Prompts } from '@sap-devx/yeoman-ui-types';
import type { NewModelAnswers, NewModelData, DescriptorVariant, CfConfig } from '@sap-ux/adp-tooling';
import {
    generateChange,
    ChangeType,
    getPromptsForNewModel,
    getVariant,
    getODataVersionFromServiceType,
    ServiceType,
    isCFEnvironment,
    isLoggedInCf,
    loadCfConfig
} from '@sap-ux/adp-tooling';
import { isOnPremiseDestination } from '@sap-ux/btp-utils';
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
            await this._createNewModelData(),
            this.fs,
            undefined,
            this.logger
        );
        this.logger.log('Change written to changes folder');
    }

    async end(): Promise<void> {
        this.logger.log('Successfully created change!');
    }

    /**
     * Creates the new model data.
     *
     * @returns {Promise<NewModelData>} The new model data.
     */
    private async _createNewModelData(): Promise<NewModelData> {
        const { modelAndDatasourceName, uri, serviceType, modelSettings, addAnnotationMode } = this.answers;
        const isCloudFoundry = await isCFEnvironment(this.projectPath);
        return {
            variant: this.variant,
            serviceType,
            isCloudFoundry,
            destinationName: isCloudFoundry ? this.answers.destination?.Name : undefined,
            ...(isCloudFoundry && this.answers.destination && {
                isOnPremiseDestination: isOnPremiseDestination(this.answers.destination)
            }),
            service: {
                name: modelAndDatasourceName,
                uri,
                modelName: serviceType === ServiceType.HTTP ? undefined : modelAndDatasourceName,
                version: getODataVersionFromServiceType(serviceType),
                modelSettings
            },
            ...(addAnnotationMode && {
                annotation: {
                    dataSourceName: `${modelAndDatasourceName}.annotation`,
                    dataSourceURI: this.answers.dataSourceURI,
                    settings: this.answers.annotationSettings
                }
            })
        };
    }
}

export = AddNewModelGenerator;
