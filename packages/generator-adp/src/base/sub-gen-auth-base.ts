import path from 'node:path';
import { Prompts } from '@sap-devx/yeoman-ui-types';

import { isAppStudio } from '@sap-ux/btp-utils';
import type { Manifest } from '@sap-ux/project-access';
import { createAbapServiceProvider, type AbapTarget } from '@sap-ux/system-access';
import type { DescriptorVariant } from '@sap-ux/adp-tooling';
import type { AxiosRequestConfig, ProviderConfiguration } from '@sap-ux/axios-extension';
import { getVariant, getAdpConfig, ManifestService, SystemLookup } from '@sap-ux/adp-tooling';

import { initI18n } from '../utils/i18n';
import SubGeneratorBase from './sub-gen-base';
import type { GeneratorOpts } from '../utils/opts';
import type { GeneratorTypes, Credentials } from '../types';
import { getCredentialsPrompts } from './questions/credentials';
import { getSubGenAuthPages } from '../utils/steps';

/**
 * Base class for *sub* generators that need authentication handling.
 * Adds functionality on top of {@link SubGeneratorBase}.
 */
export default class SubGeneratorWithAuthBase extends SubGeneratorBase {
    /**
     * The ABAP target.
     */
    protected abapTarget: AbapTarget;
    /**
     * The project data.
     */
    protected system: string;
    /**
     * The project path.
     */
    protected readonly projectPath: string;
    /**
     * The type of generator.
     */
    protected readonly generatorType: GeneratorTypes;
    /**
     * The manifest service.
     */
    public manifestService: ManifestService;
    /**
     * Whether the generator requires authentication.
     */
    protected requiresAuth = false;
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

        if (opts.data) {
            this.projectPath = opts.data.path;
        }
        this.vscode = opts.vscode;
    }

    /**
     * Executes logic that should happen during Yeoman's `initializing` phase.
     * Subclasses must call this to benefit from the built-in auth handling.
     */
    protected async onInit(): Promise<void> {
        await initI18n();

        this.systemLookup = new SystemLookup(this.logger);
        const adpConfig = await getAdpConfig(this.projectPath, path.join(this.projectPath, 'ui5.yaml'));
        this.abapTarget = adpConfig.target;
        this.system = (isAppStudio() ? this.abapTarget.destination : this.abapTarget.url) ?? '';
        this.logger.log(`Successfully retrieved abap target\n${JSON.stringify(this.abapTarget, null, 2)}`);

        this._registerPrompts(new Prompts(getSubGenAuthPages(this.generatorType, this.system)));

        try {
            this.requiresAuth = await this.systemLookup.getSystemRequiresAuth(this.system);
            this.logger.log(`System ${this.system} requires authentication: ${this.requiresAuth}`);

            if (!this.requiresAuth) {
                // Remove the credential page when authentication is not required
                this.prompts.splice(0, 1, []);
            }
        } catch (error) {
            await this.handleRuntimeCrash(error.message);
        }
    }

    /**
     * Retrieves and parses the manifest (app descriptor) of the current project.
     * Requests credentials when required by the destination system.
     *
     * @returns {Promise<Manifest>} The manifest.
     */
    protected async getManifest(): Promise<Manifest> {
        let requestOptions: (AxiosRequestConfig & Partial<ProviderConfiguration>) | undefined;
        if (this.requiresAuth) {
            const credentials = (await this.prompt(getCredentialsPrompts(this.abapTarget, this.logger))) as Credentials;
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
        const oDataSources = this.manifestService.getManifestDataSources();
        this.logger.log(`OData sources from manifest\n${JSON.stringify(oDataSources, null, 2)}`);

        const oDataTargetSources = Object.entries(oDataSources ?? {})
            .filter((source) => source[1]?.type === 'OData')
            .map((source) => {
                return {
                    dataSourceName: source[0],
                    uri: source[1]?.uri,
                    annotations: source[1]?.settings?.annotations ?? []
                };
            });
        this.logger.log(`OData target sources\n${JSON.stringify(oDataTargetSources, null, 2)}`);

        return manifest;
    }
}
