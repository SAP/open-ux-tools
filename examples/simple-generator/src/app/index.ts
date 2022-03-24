import { hello } from '../extension';
import Generator from 'yeoman-generator';
import { FioriElementsApp, LROPSettings, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer';
import { generate } from '@sap-ux/fiori-elements-writer';

interface Answers {
    name: string;
    entity: string;
}

export default class extends Generator {
    private appConfig: Partial<FioriElementsApp<LROPSettings>> = {};

    initializing(): void {
        this.log(
            'Example of a simple Fiori elements for OData v4 generator that only creates listreport objectpage applications.'
        );
        this.appConfig.template = {
            type: TemplateType.ListReportObjectPage,
            settings: {
                entityConfig: {}
            }
        };
        this.appConfig.service = {
            version: OdataVersion.v4
        };
    }

    async prompting(): Promise<void> {
        const answers = await this.prompt<Answers>([
            {
                type: 'input',
                name: 'name',
                message: 'Application name'
            },
            {
                type: 'input',
                name: 'entity',
                message: 'Main entity'
            }
        ]);

        this.appConfig.template.settings.entityConfig.mainEntity = {
            entityName: answers.entity
        };
        this.appConfig.app = {
            id: answers.name
        };
    }

    async writing(): Promise<void> {
        generate('./.tmp', this.appConfig as FioriElementsApp<unknown>, this.fs);
    }
}
