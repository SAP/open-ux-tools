import { join } from 'path';
import memFs from 'mem-fs';
import memFsEditor from 'mem-fs-editor';
import { composeReadMe, getDataSourceLabel, getLaunchText } from '../src/read-me/index';
import { CAP_RUNTIME } from '../src/read-me/types';
import { OdataVersion, DatasourceType } from '@sap-ux/odata-service-inquirer';
import { ApplyTemplateFunction, ReadMe } from '../src/read-me/types';
import { readFileSync } from 'fs';
import { t } from '../src/i18n';

const enum GeneratorName {
    FE = '@sap/generator-fiori-elements',
    FF = '@sap/generator-fiori-freestyle'
}

describe('Readme file tests', () => {
    const store = memFs.create();
    const editor = memFsEditor.create(store);
    const platformName = 'CLI';
    const onPremiseSystemType = 'ON_PREM';

    it('Generate - ReadMe', () => {
        const readMePath = join(__dirname, '/README.md');
       
        const applyTemplate: ApplyTemplateFunction = <P = object>(path: string, properties: P): void => {
            editor.copyTpl(join(__dirname, '../templates/README.md'), readMePath, properties!);
        };

        const service = {
            servicePath: '/some/service/path',
            host: 'http://somehost:1234',
            version: OdataVersion.v2,
            source: DatasourceType.sapSystem,
            edmx: `<?xml version="1.0" encoding="utf-8"?><MockEdmx></MockEdmx>`,
            capService: undefined
        };
       
        const serviceUrl = (service.host ?? '') + (service.servicePath ?? '');
       
        const config: Partial<ReadMe> = {
            genId: '@sap/generator-name',
            genVersion: '2.0.1',
            templateLabel: 'Some Generator Specific Template',
            genDate: 'Jan 01 1975',
            genPlatform: platformName,
            projectName: 'someProjectName',
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            serviceUrl: serviceUrl,
            showMockDataInfo: !!service.edmx && !service.capService,
            dataSourceLabel: getDataSourceLabel(DatasourceType.sapSystem, onPremiseSystemType)
        }

        composeReadMe(applyTemplate, config);
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test01/README.md'), 'utf-8'));
    });

    it('Generate - ReadMe with Additional Entries', () => {
        const readMePath = join(__dirname, '/README.md');
        const applyTemplate: ApplyTemplateFunction = <P = object>(path: string, properties: P): void => {
            //editor.copyTpl(join(__dirname, '../../../../templates/README.md'), readMePath, properties!);
            editor.copyTpl(join(__dirname, '../templates/README.md'), readMePath, properties!);
        };

        const service = {
            servicePath: '/some/service/path',
            host: 'http://somehost:1234',
            version: OdataVersion.v2,
            source: DatasourceType.sapSystem
        };
        const serviceUrl = (service.host ?? '') + (service.servicePath ?? '');

        const config: Partial<ReadMe> = {
            genId: '@sap/generator-name',
            genVersion: '2.0.1',
            templateLabel: 'Some Generator Specific Template',
            genDate: 'Jan 01 1975',
            genPlatform: platformName,
            additionalEntries: [
                {
                    label: 'Generator Specific Label A',
                    value: 'Generator Specific Value A'
                },
                {
                    label: 'Generator Specific Label B',
                    value: 'Generator Specific Value B'
                }
            ],
            projectName: 'someProjectName',
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            serviceUrl: serviceUrl,
            //showMockDataInfo: !!service.edmx && !service.capService,
            dataSourceLabel: getDataSourceLabel(DatasourceType.sapSystem, onPremiseSystemType)
        }

        composeReadMe(applyTemplate, config);
        //expect(editor.exists(readMePath)).toBeTrue();
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test02/README.md'), 'utf-8'));
    });

    it('Generate - ReadMe with DatasourceType.NONE', () => {
        const readMePath = join(__dirname, '/README.md');
        const applyTemplate: ApplyTemplateFunction = <P = object>(path: string, properties: P): void => {
            //editor.copyTpl(join(__dirname, '../../../../templates/README.md'), readMePath, properties);
            editor.copyTpl(join(__dirname, '../templates/README.md'), readMePath, properties!);
        };

        const config: Partial<ReadMe> = {
            genId:  GeneratorName.FF,
            genVersion: '2.0.1',
            templateLabel: 'simple',
            genDate: 'Jan 01 1975',
            genPlatform: platformName,
            projectName: 'someProjectName',
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            dataSourceLabel: getDataSourceLabel(DatasourceType.none)
        }

        composeReadMe(applyTemplate, config);
        //expect(editor.exists(readMePath)).toBeTrue();
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test03/README.md'), 'utf-8'));
    })

    it('Generate - ReadMe with DatasourceType.CAP', () => {
        const readMePath = join(__dirname, '/README.md');
        const applyTemplate: ApplyTemplateFunction = <P = object>(path: string, properties: P): void => {
            //editor.copyTpl(join(__dirname, '../../../../templates/README.md'), readMePath, properties);
            editor.copyTpl(join(__dirname, '../templates/README.md'), readMePath, properties!);
        };

        const service = {
            //version: OdataVersion.v4,
            source: DatasourceType.capProject,
            capService: {
                capType: CAP_RUNTIME.JAVA,
                projectPath: 'a/b/c',
                serviceName: 'cap_service_name'
            }
        };
        const projectName = 'someProjectName';
        const genId = GeneratorName.FE;
        const config: Partial<ReadMe> = {
            genId:  genId,
            genVersion: '2.0.1',
            templateLabel: 'List Report Page V4',
            genDate: 'Jan 01 1975',
            genPlatform: platformName,
            projectName: projectName,
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            dataSourceLabel: getDataSourceLabel(DatasourceType.capProject),
            launchText: getLaunchText(service.capService.capType, projectName, genId)
        }

        composeReadMe(applyTemplate, config);

        //expect(editor.exists(readMePath)).toBeTrue();
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test04/README.md'), 'utf-8'));
    });

    it("Generate - ReadMe with custom datasource label: 'SAP API Business Hub Enterprise'", () => {
        const readMePath = join(__dirname, '/README.md');
        const applyTemplate: ApplyTemplateFunction = <P = object>(path: string, properties: P): void => {
            //editor.copyTpl(join(__dirname, '../../../../templates/README.md'), readMePath, properties);
            editor.copyTpl(join(__dirname, '../templates/README.md'), readMePath, properties!);
        };
        const config: Partial<ReadMe> = {
            genId:  GeneratorName.FF,
            genVersion: '2.0.1',
            templateLabel: 'simple',
            genDate: 'Jan 01 1975',
            genPlatform: platformName,
            projectName: 'someProjectName',
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            dataSourceLabel: getDataSourceLabel(DatasourceType.businessHub, "",true)
        }


        composeReadMe(applyTemplate, config);

        //expect(editor.exists(readMePath)).toBeTrue();
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test05/README.md'), 'utf-8'));
        //expect(editor.read(readMePath)).toMatchSnapshot();
    });
})

describe('Get Launch Text tests', () => {
    it('Tests for utils functions ', () => {
        let mvnCommand = ' (```mvn spring-boot:run```)';
        let capUrl = `http://localhost:8080/project1/webapp/index.html`;
        let workspaceCapUrl = `http://localhost:4004/test.app.project1/index.html`;

        expect(getLaunchText(CAP_RUNTIME.JAVA, 'project1', '', false)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
        );
        capUrl = `http://localhost:4004/project1/webapp/index.html`;
        mvnCommand = '';

        expect(getLaunchText(CAP_RUNTIME.NODE_JS, 'project1', '', false)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
        );
        expect(getLaunchText(undefined, 'project1', 'test.app.project1', true)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl: workspaceCapUrl })}`
        );

        expect(getLaunchText(undefined, 'project1', '', false)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
        );
        expect(getLaunchText(undefined, 'project1', 'test.app.project1', true)).toBe(
            `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl: workspaceCapUrl })}`
        );
    });
});
      