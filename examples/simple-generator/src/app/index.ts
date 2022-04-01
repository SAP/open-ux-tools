import { join } from 'path';
import Generator from 'yeoman-generator';
import { FioriElementsApp, LROPSettings, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer';
import { generate } from '@sap-ux/fiori-elements-writer';

interface Answers {
    name: string;
    entity: string;
    service: string;
}

export default class extends Generator {
    private appConfig!: FioriElementsApp<LROPSettings>;

    initializing(): void {
        this.log(
            'Example of a simple Fiori elements for OData v4 generator that only creates listreport objectpage applications.'
        );
    }

    async prompting(): Promise<void> {
        const answers = await this.prompt<Answers>([
            {
                type: 'input',
                name: 'name',
                message: 'Application name',
                validate: (answer) => !!answer
            },
            {
                type: 'input',
                name: 'service',
                message: 'Service url',
                validate: (answer) => !!answer
            },
            {
                type: 'input',
                name: 'entity',
                message: 'Main entity',
                validate: (answer) => !!answer
            }
        ]);

        const service = new URL(answers.service);

        this.appConfig = {
            app: {
                id: answers.name
            },
            appOptions: {
                loadReuseLibs: true
            },
            template: {
                type: TemplateType.ListReportObjectPage,
                settings: {
                    entityConfig: {
                        mainEntityName: answers.entity
                    }
                }
            },
            package: {
                name: answers.name
            },
            service: {
                version: OdataVersion.v4,
                url: service.origin,
                path: service.pathname
            }
        };
    }

    configuring() {
        this.sourceRoot(join(__dirname, '..', '..', 'templates'));
        this.destinationRoot(join('.tmp', this.appConfig.package.name));
    }

    async writing(): Promise<void> {
        // generating Fiori elements project
        generate(this.destinationRoot(), this.appConfig, this.fs);

        // adding husky config that is checking for security issues before each commit
        this.copyTemplate(this.templatePath('husky'), this.destinationPath('.husky'));
        this.fs.extendJSON(this.destinationPath('package.json'), {
            devDependencies: {
                husky: '7.0.4'
            }
        });
    }
}
