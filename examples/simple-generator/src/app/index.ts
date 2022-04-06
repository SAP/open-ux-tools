import { join } from 'path';
import Generator from 'yeoman-generator';

import type { Template, LROPSettings, OVPSettings } from '@sap-ux/fiori-elements-writer';
import { generate as generateFE, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import type { Template as FreestyleTemplate } from '@sap-ux/fiori-freestyle-writer';
import { generate as generateUI5, TemplateType as FreestyleTemplateType } from '@sap-ux/fiori-freestyle-writer';
import type { Ui5App } from '@sap-ux/ui5-application-writer';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ServiceInfo } from './service';
import { getServiceInfo, getServiceInfoInBAS } from './service';

export default class extends Generator {
    private app!: Ui5App & { app: { flpAppId: string } };
    private service!: OdataService;
    private template: {
        type: TemplateType | FreestyleTemplateType.Basic;
        settings?: LROPSettings | OVPSettings | {};
    };

    initializing(): void {
        this.log(
            'Example of a simple Fiori elements for OData v4 generator that only creates listreport objectpage applications.'
        );
    }

    async prompting(): Promise<void> {
        const { name, template } = await this.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Application name',
                validate: (answer) => !!answer
            },
            {
                type: 'list',
                name: 'template',
                message: 'Template',
                choices: [
                    { value: TemplateType.ListReportObjectPage, name: 'List Report' },
                    { value: TemplateType.OverviewPage, name: 'Overview Page' },
                    { value: FreestyleTemplateType.Basic, name: 'Freestyle App' }
                ]
            }
        ]);

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

        this.service = {
            version: OdataVersion.v2,
            url: service.url,
            path: service.path,
            destination: {
                name: service.destination
            },
            metadata: service.metadata
        };
        this.app = {
            app: {
                id: name,
                flpAppId: 'app-preview'
            },
            appOptions: {
                loadReuseLibs: true
            },
            package: {
                name
            }
        };
        this.template = {
            type: template
        };
        switch (template) {
            case TemplateType.OverviewPage:
                this.template.settings = {
                    filterEntityType: entity
                } as OVPSettings;
                break;
            case TemplateType.ListReportObjectPage:
                this.template.settings = {
                    entityConfig: {
                        mainEntityName: entity
                    }
                } as LROPSettings;
                break;
            default:
                this.template.settings = {};
                break;
        }
    }

    configuring() {
        this.sourceRoot(join(__dirname, '..', '..', 'templates', 'karma'));
        this.destinationRoot(join('.tmp', this.app.package.name));
    }

    async writing(): Promise<void> {
        if (this.template.type === FreestyleTemplateType.Basic) {
            // generate a plain UI5 application
            await generateUI5(
                this.destinationRoot(),
                {
                    ...this.app,
                    service: this.service,
                    ui5: {
                        minUI5Version: '1.99.0'
                    },
                    template: this.template as FreestyleTemplate
                },
                this.fs
            );
        } else {
            // generate Fiori elements project
            await generateFE(
                this.destinationRoot(),
                {
                    ...this.app,
                    service: this.service,
                    template: this.template as Template
                },
                this.fs
            );
        }

        // adding karma configuration using the mockserver middleware
        this.copyTemplate(this.templatePath('karma.conf.js'), this.destinationPath('karma.conf.js'));
        this.fs.extendJSON(this.destinationPath('package.json'), this.fs.readJSON(this.templatePath('package.json')));
    }
}
