import { join } from 'path';
import Generator from 'yeoman-generator';

import type { Template, LROPSettings, OVPSettings, FPMSettings } from '@sap-ux/fiori-elements-writer';
import { generate as generateFE, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { ODataVersion } from '@sap-ux/axios-extension';
import type { Template as FreestyleTemplate } from '@sap-ux/fiori-freestyle-writer';
import { generate as generateUI5, TemplateType as FreestyleTemplateType } from '@sap-ux/fiori-freestyle-writer';
import type { Ui5App } from '@sap-ux/ui5-application-writer';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { ServiceInfo } from './service';
import { getServiceInfo, getServiceInfoInBAS } from './service';
import { getUI5Versions } from './ui5';

/**
 *
 */
export default class extends Generator {
    private app!: Ui5App & { app: { flpAppId: string } };
    private service!: OdataService;
    private template: {
        type: TemplateType | FreestyleTemplateType.Basic;
        settings?: LROPSettings | OVPSettings | {};
    };

    /**
     * Enables the CLI parameter --typescript and then calls the base constructor.
     *
     * @param args yo args
     * @param options yo options
     * @param features yo features
     */
    constructor(
        args: string | string[],
        options: Generator.GeneratorOptions,
        features?: Generator.GeneratorFeatures | undefined
    ) {
        super(args, options, features);
        this.option('typescript');
    }

    /**
     * Just logging what is running.
     */
    initializing(): void {
        this.log('Example of a simple Fiori generator allowing to create basic UI5 or Fiori elements applications.');
        if (this.options.typescript) {
            this.log('Typescript is set via CLI.');
        }
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
                    { value: TemplateType.FlexibleProgrammingModel, name: 'FPM (requires an OData v4 service)' },
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
            default: this.config.get('entity'),
            validate: (answer) => !!answer
        });

        this.service = {
            version: service.odataVersion === ODataVersion.v4 ? OdataVersion.v4 : OdataVersion.v2,
            url: service.url,
            path: service.path,
            metadata: service.metadata,
            annotations: service.annotations
        };
        if (service.destination) {
            this.service.destination = {
                name: service.destination
            };
        }
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
            case TemplateType.FlexibleProgrammingModel:
                this.template.settings = {
                    pageName: 'Main',
                    entityConfig: {
                        mainEntityName: entity
                    }
                } as FPMSettings;
                break;
            default:
                this.template.settings = {};
                break;
        }
    }

    configuring() {
        // configuring the source/template root folder to point to the folder containing the karma templates
        this.sourceRoot(join(__dirname, '..', '..', 'templates', 'karma'));
        // hard-coded output folder just for testing, in a real generator the .tmp prefix is not needed
        this.destinationRoot(join('.tmp', this.app.package.name));
    }

    async writing(): Promise<void> {
        const appOptions = {
            typescript: this.options.typescript
        };
        if (this.template.type === FreestyleTemplateType.Basic) {
            // generate a plain UI5 application
            await generateUI5(
                this.destinationRoot(),
                {
                    ...this.app,
                    service: this.service,
                    ui5: {
                        minUI5Version: (await getUI5Versions()).latest.version
                    },
                    template: this.template as FreestyleTemplate,
                    appOptions
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
                    template: this.template as Template,
                    appOptions
                },
                this.fs
            );
        }

        // adding karma configuration using the mockserver middleware
        this.copyTemplate(this.templatePath('karma.conf.js'), this.destinationPath('karma.conf.js'));
        this.fs.extendJSON(this.destinationPath('package.json'), this.fs.readJSON(this.templatePath('package.json')));
    }
}
