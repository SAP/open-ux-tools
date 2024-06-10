import path, { join } from 'path';
import memFs from 'mem-fs';
import memFsEditor from 'mem-fs-editor';
import { generateReadMe, getDataSourceLabel, getLaunchText } from '../src/read-me/index';
import { OdataVersion, DatasourceType } from '@sap-ux/odata-service-inquirer';
import type { ReadMe } from '../src/read-me/types';
import { readFileSync } from 'fs';
import { t } from '../src/i18n';

const enum GeneratorName {
    FE = '@sap/generator-fiori-elements',
    FF = '@sap/generator-fiori-freestyle'
}

const commonConfig: Partial<ReadMe> = {
    genVersion: '2.0.1',
    genDate: 'Jan 01 1975',
    genPlatform: 'CLI',
    projectName: 'someProjectName',
    projectTitle: 'someProjectTitle',
    projectDescription: 'Fiori project description',
    ui5Theme: 'a_ui5_theme',
    projectUI5Version: '1.2.3',
    projectNamespace: 'projectNamespace'
};

const generateReadMeConfig = (overrides: Partial<ReadMe>): Partial<ReadMe> => {
    return {
        ...commonConfig,
        ...overrides
    };
};

describe('Readme file generation tests', () => {
    const store = memFs.create();
    const editor = memFsEditor.create(store);
    const onPremiseSystemType = 'ON_PREM';

    it('should generate README.md with the correct content - test case 04', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const readMeTemplatePath = path.join(__dirname, '..', 'templates', 'README.md');
        const expectReadMePath = path.join(__dirname, './expected/test04/README.md');
        const realJoin = path.join;
        const mockJoin = jest.spyOn(path, 'join');
        mockJoin.mockImplementation((...args): string => {
            console.log(args);
            if (args.includes('templates')) {
                console.log(readMeTemplatePath);
                return readMeTemplatePath;
            } else {
                console.log(realJoin(...args));
                return realJoin(...args);
            }
        });
        const config = generateReadMeConfig({
            genId: GeneratorName.FE,
            templateLabel: 'List Report Page V4',
            dataSourceLabel: getDataSourceLabel(DatasourceType.capProject, "", true),
            launchText: getLaunchText('Java', commonConfig.projectName!, GeneratorName.FE)
        });
        generateReadMe(__dirname, config, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(expectReadMePath, 'utf-8'));
    });

    it('should generate README.md with service URL - test case 01', () => {
        const readMePath = join(__dirname, '/README.md');
        const service = {
            servicePath: '/some/service/path',
            host: 'http://somehost:1234',
            version: OdataVersion.v2,
            source: DatasourceType.sapSystem,
            edmx: `<?xml version="1.0" encoding="utf-8"?><MockEdmx></MockEdmx>`,
            capService: undefined
        };
        const serviceUrl = (service.host ?? '') + (service.servicePath ?? '');
        const config = generateReadMeConfig({
            genId: '@sap/generator-name',
            templateLabel: 'Some Generator Specific Template',
            serviceUrl,
            showMockDataInfo: !!service.edmx && !service.capService,
            dataSourceLabel: getDataSourceLabel(DatasourceType.sapSystem, onPremiseSystemType)
        });
        generateReadMe(__dirname, config, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test01/README.md'), 'utf-8'));
    });

    it('should generate README.md with additional entries - test case 02', () => {
        const readMePath = join(__dirname, '/README.md');
        const service = {
            servicePath: '/some/service/path',
            host: 'http://somehost:1234',
            version: OdataVersion.v2,
            source: DatasourceType.sapSystem
        };
        const serviceUrl = (service.host ?? '') + (service.servicePath ?? '');
        const config = generateReadMeConfig({
            genId: '@sap/generator-name',
            templateLabel: 'Some Generator Specific Template',
            additionalEntries: [
                { label: 'Generator Specific Label A', value: 'Generator Specific Value A' },
                { label: 'Generator Specific Label B', value: 'Generator Specific Value B' }
            ],
            serviceUrl,
            dataSourceLabel: getDataSourceLabel(DatasourceType.sapSystem, onPremiseSystemType)
        });
        generateReadMe(__dirname, config, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test02/README.md'), 'utf-8'));
    });

    it('should generate README.md with DatasourceType.NONE - test case 03', () => {
        const readMePath = join(__dirname, '/README.md');
        const config = generateReadMeConfig({
            genId: GeneratorName.FF,
            templateLabel: 'simple',
            dataSourceLabel: getDataSourceLabel(DatasourceType.none)
        });
        generateReadMe(__dirname, config, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test03/README.md'), 'utf-8'));
    });

    it('should generate README.md with custom datasource label SAP API Business Hub Enterprise - test case 05', () => {
        const readMePath = join(__dirname, '/README.md');
        const config = generateReadMeConfig({
            genId: GeneratorName.FF,
            templateLabel: 'simple',
            dataSourceLabel: getDataSourceLabel(DatasourceType.businessHub, "", true)
        });
        generateReadMe(__dirname, config, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(join(__dirname, './expected/test05/README.md'), 'utf-8'));
    });
});

// describe('Launch Text utility function tests', () => {
//     it('should generate correct launch text', () => {
//         let mvnCommand = ' (```mvn spring-boot:run```)';
//         let capUrl = `http://localhost:8080/project1/webapp/index.html`;
//         let workspaceCapUrl = `http://localhost:4004/test.app.project1/index.html`;

//         expect(getLaunchText('Java', 'project1', undefined)).toBe(
//             `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
//         );
//         capUrl = `http://localhost:4004/project1/webapp/index.html`;
//         mvnCommand = '';

//         expect(getLaunchText('Node.js', 'project1', undefined)).toBe(
//             `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
//         );
//         expect(getLaunchText(undefined, 'project1', 'test.app.project1')).toBe(
//             `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl: workspaceCapUrl })}`
//         );

//         expect(getLaunchText(undefined, 'project1', undefined)).toBe(
//             `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`
//         );
//         expect(getLaunchText(undefined, 'project1', 'test.app.project1')).toBe(
//             `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl: workspaceCapUrl })}`
//         );
//     });
// });
