import { MessageType } from '@sap-devx/yeoman-ui-types';

import {
    ChangeType,
    generateChange,
    AnnotationFileSelectType,
    getPromptsForAddAnnotationsToOData
} from '@sap-ux/adp-tooling';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { getAnnotationNamespaces } from '@sap-ux/odata-service-writer';
import type { AnnotationsData, AddAnnotationsAnswers } from '@sap-ux/adp-tooling';

import { t } from '../utils/i18n';
import { GeneratorTypes } from '../types';
import SubGeneratorWithAuthBase from '../base/sub-gen-auth-base';
import type { GeneratorOpts } from '../utils/opts';

/**
 * Generator for adding annotations to OData services.
 */
class AddAnnotationsToDataGenerator extends SubGeneratorWithAuthBase {
    /**
     * The answers from the prompts.
     */
    private answers: AddAnnotationsAnswers;
    /**
     * The data sources from the manifest.
     */
    private dataSources: Record<string, ManifestNamespace.DataSource>;

    /**
     * Creates an instance of the generator.
     *
     * @param {string | string[]} args - The arguments passed to the generator.
     * @param {GeneratorOpts} opts - The options for the generator.
     */
    constructor(args: string | string[], opts: GeneratorOpts) {
        super(args, opts, GeneratorTypes.ADD_ANNOTATIONS_TO_DATA);
    }

    async initializing(): Promise<void> {
        await this.onInit();
    }

    async prompting(): Promise<void> {
        try {
            const manifest = await this.getManifest();
            this.dataSources = manifest?.['sap.app']?.dataSources ?? {};
            this.answers = await this.prompt(getPromptsForAddAnnotationsToOData(this.projectPath, this.dataSources));
            this.logger.log(`Current OData services\n${JSON.stringify(this.answers, null, 2)}`);
        } catch (e) {
            await this.handleRuntimeCrash(e.message);
        }
    }

    async writing(): Promise<void> {
        const changeData: AnnotationsData = {
            variant: this.variant,
            isCommand: true,
            annotation: {
                dataSource: this.answers.id,
                filePath: this.answers.filePath,
                serviceUrl: this.dataSources?.[this.answers.id]?.uri
            }
        };

        if (!this.answers.filePath) {
            const metadata = await this.manifestService.getDataSourceMetadata(this.answers.id);
            changeData.annotation.namespaces = getAnnotationNamespaces({ metadata });
        }

        await generateChange<ChangeType.ADD_ANNOTATIONS_TO_ODATA>(
            this.projectPath,
            ChangeType.ADD_ANNOTATIONS_TO_ODATA,
            changeData,
            this.fs
        );
        this.logger.log('Change written to changes folder');

        if (this.answers.fileSelectOption === AnnotationFileSelectType.NewEmptyFile) {
            this.appWizard.showInformation(t('prompts.emptyAnnotationFile'), MessageType.notification);
        }
    }

    end(): void {
        this.logger.log('Successfully created annotation file!');
    }
}

export = AddAnnotationsToDataGenerator;
