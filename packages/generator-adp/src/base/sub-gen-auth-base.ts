import path from 'path';
import type Generator from 'yeoman-generator';
import type { IPrompt } from '@sap-devx/yeoman-ui-types';
import { MessageType, Prompts } from '@sap-devx/yeoman-ui-types';

import {
    getVariant,
    getAdpConfig,
    ManifestService,
    SystemLookup,
    getConfiguredProvider,
    getSystemUI5Version,
    getAdpProjectData
} from '@sap-ux/adp-tooling';
import type { Manifest } from '@sap-ux/project-access';
import type { AdpProjectData } from '@sap-ux/adp-tooling';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import type { InputQuestion, PasswordQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { DataSource, DataSources, DescriptorVariant } from '@sap-ux/adp-tooling';
import type { AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';

import { t } from '../utils/i18n';
import { GeneratorTypes } from '../types';
import type { Credentials } from '../types';
import SubGeneratorBase from './sub-gen-base';
import { configPromptNames } from '../app/types';
import type { GeneratorOpts } from '../utils/opts';

/**
 * Base class for *sub* generators that need authentication handling.
 * Adds functionality on top of {@link SubGeneratorBase}:
 *  - automatic credential prompts depending on the target environment (CF / ABAP / S4HC)
 *  - convenience helpers for manifest & OData processing
 */
export default class SubGeneratorWithAuthBase extends SubGeneratorBase {
    public setPromptsCallback: (fn: any) => void;
    public prompts!: Prompts;

    /**
     * The project data.
     */
    protected projectData: AdpProjectData;
    /**
     * The project path.
     */
    protected readonly projectPath: string;
    /**
     * The type of generator.
     */
    protected readonly generatorType: GeneratorTypes;
    /**
     * The manifest.
     */
    protected manifest: Manifest;
    /**
     * The manifest service.
     */
    public manifestService: ManifestService;
    /**
     * The OData target sources.
     */
    protected oDataTargetSources: DataSource[] = [];
    /**
     * The OData sources.
     */
    protected oDataSources: DataSources;
    /**
     * Whether the generator is used internally.
     */
    protected isInternalUsage = false;
    /**
     * Whether the generator requires authentication.
     */
    protected requiresAuthentication = false;
    /**
     * The descriptor variant.
     */
    protected variant: DescriptorVariant;
    /**
     * The system lookup instance.
     */
    protected systemLookup: SystemLookup;
    /**
     * The VSCode instance.
     */
    private readonly vscode: any;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {Generator.GeneratorOptions} opts - The options for the generator.
     * @param {GeneratorTypes} type - The type of generator.
     */
    constructor(args: string | string[], opts: GeneratorOpts, type: GeneratorTypes) {
        super(args, opts, type);
        this.generatorType = type;

        try {
            if (opts.data) {
                this.projectPath = opts.data.path;
            }
            this.vscode = opts.vscode;
        } catch (e) {
            this.validationError = e as Error;
        }

        this.isInternalUsage = isInternalFeaturesSettingEnabled();
        this._setPrompts();
    }

    /**
     * Executes logic that should happen during Yeoman's `initializing` phase.
     * Subclasses must call this to benefit from the built-in auth handling.
     */
    protected async onInit(): Promise<void> {
        this.systemLookup = new SystemLookup(this.logger);
        this.projectData = await getAdpProjectData(this.projectPath);
        this.logger.log(`Successfully retrieved project data\n${JSON.stringify(this.projectData, null, 2)}`);

        if (this.validationError) {
            this.appWizard.showError(this.validationError.message, MessageType.notification);
            await this.handleRuntimeCrash(this.validationError.message);
            return;
        }

        try {
            this.requiresAuthentication = await this.systemLookup.getSystemRequiresAuth(this.projectData.sourceSystem);
            this.logger.log(
                `Destination ${this.projectData.sourceSystem} ${
                    this.requiresAuthentication ? 'requires' : 'does not require'
                } authentication`
            );

            if (!this.requiresAuthentication) {
                // Remove the credential page when authentication is not required
                this.prompts.splice(0, 1, [] as unknown as any);
            }
        } catch (error) {
            await this.handleRuntimeCrash(error.message);
        }
    }

    /**
     * Retrieves and parses the manifest (app descriptor) of the current project.
     * Requests credentials when required by the destination system.
     */
    protected async getManifest(): Promise<void> {
        let requestOptions: (AxiosRequestConfig & Partial<ProviderConfiguration>) | undefined;
        if (this.requiresAuthentication) {
            const credentials = (await this.prompt(this.getABAPCredentialsPrompts(this.projectData))) as Credentials;
            requestOptions = { auth: { username: credentials.username, password: credentials.password } };
        }

        this.variant = await getVariant(this.projectPath);
        const yamlPath = path.join(this.projectPath, 'ui5.yaml');
        const { target, ignoreCertErrors = false } = await getAdpConfig(this.projectPath, yamlPath);
        const provider = await createAbapServiceProvider(
            target,
            { ...requestOptions, ignoreCertErrors },
            true,
            this.logger
        );
        this.manifestService = await ManifestService.initMergedManifest(
            provider,
            this.projectPath,
            this.variant,
            this.logger
        );
        const manifest = this.manifestService.getManifest();
        this.oDataSources = this.manifestService.getManifestDataSources();
        this.logger.log(`OData sources from manifest\n${JSON.stringify(this.oDataSources, null, 2)}`);
        this.oDataTargetSources = Object.entries(this.oDataSources ?? {})
            .filter((dS) => dS[1]?.type === 'OData')
            .map((dS) => {
                return {
                    dataSourceName: dS[0],
                    uri: dS[1]?.uri,
                    annotations: dS[1]?.settings?.annotations ?? []
                };
            });
        this.logger.log(`OData target sources\n${JSON.stringify(this.oDataTargetSources, null, 2)}`);
        this.manifest = manifest;
    }

    private _setPrompts(): void {
        this.setPromptsCallback = (fn): void => {
            if (this.prompts) {
                this.prompts.setCallback(fn);
            }
        };

        if (this.validationError) {
            this.prompts = new Prompts(this._errorPage(this.generatorType));
        } else {
            this.prompts = new Prompts(
                this.getSubGeneratorsWithAuthenticationPages(this.generatorType, this.projectData?.sourceSystem)
            );
        }
    }

    /**
     * Returns the error page for the given sub generator type.
     *
     * @param subGenType - The type of sub generator.
     * @returns The error page for the given sub generator type.
     */
    private _errorPage(subGenType: GeneratorTypes): IPrompt[] {
        switch (subGenType) {
            case GeneratorTypes.ADD_ANNOTATIONS_TO_DATA:
                return [{ name: 'Add Local Annotation File', description: '' }];
            case GeneratorTypes.CHANGE_DATA_SOURCE:
                return [{ name: 'Replace OData Service', description: '' }];
            default:
                return [];
        }
    }

    /**
     * Returns the prompts for the given sub generator type.
     *
     * @param type - The type of sub generator.
     * @param destination - The destination of the sub generator.
     * @returns The prompts for the given sub generator type.
     */
    private getSubGeneratorsWithAuthenticationPages(type: GeneratorTypes, destination: string): IPrompt[] {
        const getCredentialsPageProps = (nameBase: string): { name: string; description: string } => ({
            name: `${nameBase} - Credentials`,
            description: `Enter credentials for your adaptation project's system (${destination})`
        });

        switch (type) {
            case GeneratorTypes.ADD_ANNOTATIONS_TO_DATA:
                return [
                    getCredentialsPageProps('Add Local Annotation File'),
                    { name: 'Add Local Annotation File', description: 'Select OData Service and Annotation XML' }
                ];
            case GeneratorTypes.CHANGE_DATA_SOURCE:
                return [
                    getCredentialsPageProps('Replace OData Service'),
                    { name: 'Replace OData Service', description: 'Select OData Service and new OData URI' }
                ];
            default:
                return [];
        }
    }

    /**
     * Returns the username prompt.
     *
     * @param projectData - The project data.
     * @returns The username prompt.
     */
    protected getABAPCredentialsPrompts(projectData: AdpProjectData): YUIQuestion<Credentials>[] {
        return [this.getUsernamePrompt(), this.getPasswordPrompt(projectData)];
    }

    /**
     * Returns the username prompt.
     *
     * @returns The username prompt.
     */
    private getUsernamePrompt(): InputQuestion<Credentials> {
        return {
            type: 'input',
            name: configPromptNames.username,
            message: t('prompts.usernameLabel'),
            validate: validateEmptyString,
            guiOptions: {
                mandatory: true
            }
        };
    }

    /**
     * Returns the password prompt.
     *
     * @param projectData - The project data.
     * @returns The password prompt.
     */
    private getPasswordPrompt(projectData: AdpProjectData): PasswordQuestion<Credentials> {
        return {
            type: 'password',
            name: configPromptNames.password,
            message: t('prompts.passwordLabel'),
            mask: '*',
            guiOptions: {
                mandatory: true,
                type: 'login'
            },
            validate: async (value: string, answers: Credentials): Promise<boolean | string> => {
                const validationResult = validateEmptyString(value);
                if (typeof validationResult === 'string') {
                    return validationResult;
                }

                if (!answers.username) {
                    return 'Please provide all required data';
                }

                try {
                    const options = {
                        system: projectData.sourceSystem,
                        client: projectData.client ?? '',
                        username: answers.username,
                        password: answers.password
                    };

                    const abapProvider = await getConfiguredProvider(options, this.logger);
                    await getSystemUI5Version(abapProvider);

                    return true;
                } catch (e) {
                    return e.response ? `Login failed: ${e.response.status} ${e.response.statusText}` : 'Login failed.';
                }
            }
        };
    }
}
