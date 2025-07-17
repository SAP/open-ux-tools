import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ChangeDataSourceAnswers } from '@sap-ux/adp-tooling';
import { getPromptsForChangeDataSource, generateChange, ChangeType } from '@sap-ux/adp-tooling';

import { GeneratorTypes } from '../types';
import type { GeneratorOpts } from '../utils/opts';
import SubGeneratorWithAuthBase from '../base/sub-gen-auth-base';

/**
 * Generator for changing the data source of an OData service.
 */
class OdataServiceGenerator extends SubGeneratorWithAuthBase {
    /**
     * The answers for the generator.
     */
    private answers: ChangeDataSourceAnswers;
    /**
     * The data sources from the manifest.
     */
    private dataSources: Record<string, ManifestNamespace.DataSource>;

    /**
     * Constructor for the OdataServiceGenerator.
     *
     * @param {string | string[]} args - The arguments for the generator.
     * @param {GeneratorOpts} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: GeneratorOpts) {
        super(args, opts, GeneratorTypes.CHANGE_DATA_SOURCE);
    }

    async initializing(): Promise<void> {
        await this.onInit();
    }

    async prompting(): Promise<void> {
        try {
            const manifest = await this.getManifest();
            this.dataSources = manifest?.['sap.app']?.dataSources ?? {};
            this.answers = await this.prompt(getPromptsForChangeDataSource(this.dataSources));
            this.logger.log(`Current OData services\n${JSON.stringify(this.answers, null, 2)}`);
        } catch (error) {
            await this.handleRuntimeCrash(error.message);
        }
    }

    async writing(): Promise<void> {
        await generateChange<ChangeType.CHANGE_DATA_SOURCE>(
            this.projectPath,
            ChangeType.CHANGE_DATA_SOURCE,
            {
                variant: this.variant,
                dataSources: this.dataSources,
                service: this.answers
            },
            this.fs
        );
        this.logger.log('Change written to changes folder');
    }

    end(): void {
        this.logger.log('Successfully created OData Change!');
    }
}

export = OdataServiceGenerator;
