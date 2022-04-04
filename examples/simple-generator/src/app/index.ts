import { join } from 'path';
import Generator from 'yeoman-generator';
import type { FioriElementsApp, LROPSettings } from '@sap-ux/fiori-elements-writer';
import { generate, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getServiceInfo, getServiceInfoInBAS } from './service';
import type { ServiceInfo } from './service';

export default class extends Generator {
    private appConfig!: FioriElementsApp<LROPSettings>;

    initializing(): void {
        this.log(
            'Example of a simple Fiori elements for OData v4 generator that only creates listreport objectpage applications.'
        );
    }

    async prompting(): Promise<void> {
        const { name } = await this.prompt({
            type: 'input',
            name: 'name',
            message: 'Application name',
            validate: (answer) => !!answer
        });

        let service: ServiceInfo;
        if (isAppStudio()) {
            service = await getServiceInfoInBAS(this);
        } else {
            service = await getServiceInfo(this);
        }

        const { entity } = await this.prompt({
            type: 'input',
            name: 'entity',
            message: 'Main entity',
            validate: (answer) => !!answer
        });

        this.appConfig = {
            app: {
                id: name,
                flpAppId: 'app-preview'
            },
            appOptions: {
                loadReuseLibs: true
            },
            template: {
                type: TemplateType.ListReportObjectPage,
                settings: {
                    entityConfig: {
                        mainEntityName: entity
                    }
                }
            },
            package: {
                name
            },
            service: {
                version: OdataVersion.v2,
                url: service.url,
                path: service.path,
                destination: {
                    name: service.destination
                },
                metadata: service.metadata
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
