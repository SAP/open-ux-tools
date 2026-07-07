import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import memFs from 'mem-fs';
import memFsEditor from 'mem-fs-editor';
import { generateAppGenInfo, getFloorplanLabel } from '../../src/app-gen-info.js';
import { initI18n } from '../../src/i18n.js';
import type { AppGenInfo } from '../../src/types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getLaunchText(): string {
    return (
        'In order to launch the generated app, simply start your CAP project (```mvn spring-boot:run```) and navigate to the following location in your browser:' +
        `\n` +
        `\n` +
        'http://localhost:8080/someProjectName/webapp/index.html'
    );
}

describe('Readme file generation tests', () => {
    const store = memFs.create();
    const editor = memFsEditor.create(store);

    it('should generate README.md with the correct content including core and optional properties', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const appGenInfo: AppGenInfo = {
            generatorName: '@sap/generator-fiori-elements',
            template: 'List Report Page V4',
            serviceType: 'Local Cap',
            launchText: getLaunchText(),
            generatorVersion: '2.0.1',
            generationDate: 'Jan 01 1975',
            generatorPlatform: 'CLI',
            serviceId: 'ABCD_MOCKSERVICE_O2',
            serviceUrl: 'http://mock.url/with/path/to/odata',
            appName: 'appName',
            appTitle: 'appTitle',
            appDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            ui5Version: '1.2.3',
            appNamespace: 'appNamespace',
            externalParameters: {
                'addEntry1': 'Generator Specific Value A',
                'addEntry2': 'Generator Specific Value B',
                'addEntryArr': [
                    {
                        prop1: 'value1',
                        prop2: 'value2',
                        prop3: 'value3',
                        prop4: 'value4'
                    },
                    {
                        prop1: 'valuea',
                        prop2: 'valueb',
                        prop3: 'valuec',
                        prop4: 'valued'
                    }
                ],
                abapCSN: {
                    services: [
                        { type: 'abapCSN', runtimeName: 'ABCD_MockService_O1', csnServiceName: 'MockService' },
                        { type: 'abapCSN', runtimeName: 'ABCD_MockService_O2', csnServiceName: 'MockService2' },
                        { type: 'abapCSN', runtimeName: 'ABCD_MockService_O3', csnServiceName: 'MockService3' }
                    ],
                    csnName: 'MOCKCSN55.abap.csn',
                    packageUri: 'abapfs:/BAS_DEST/MOCK_CSN_TEST1'
                }
            },
            enableEslint: false,
            enableTypeScript: false
        };
        generateAppGenInfo(__dirname, appGenInfo, editor);
        expect(editor.read(readMePath)).toMatchSnapshot();
        expect(editor.readJSON(path.join(__dirname, '/.appGenInfo.json'))).toMatchSnapshot();
    });

    it('should generate README.md with enableEslint set to true', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const readMe: AppGenInfo = {
            generatorName: '@sap/generator-fiori-elements',
            template: 'List Report Page V4',
            generatorVersion: '2.0.1',
            appName: 'appName',
            appTitle: 'appTitle',
            appDescription: 'Fiori project description',
            appNamespace: 'appNamespace',
            enableEslint: true
        };
        generateAppGenInfo(__dirname, readMe, editor);
        expect(editor.read(readMePath)).toMatchSnapshot();
    });

    it('should generate README.md with core properties', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const readMe: AppGenInfo = {
            generatorName: '@sap/generator-fiori-elements',
            template: 'List Report Page V4',
            generatorVersion: '2.0.1',
            appName: 'appName',
            appTitle: 'appTitle',
            appDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            ui5Version: '1.2.3',
            appNamespace: 'appNamespace',
            entityRelatedConfig: [{ type: 'Main Entity', value: 'Product' }]
        };
        generateAppGenInfo(__dirname, readMe, editor);
        expect(editor.read(readMePath)).toMatchSnapshot();
    });
});

describe('getFloorplanLabel', () => {
    beforeAll(async () => {
        await initI18n();
    });

    test('should return label without version suffix when no odataVersion provided', () => {
        expect(getFloorplanLabel('lrop')).toBe('List Report Page');
        expect(getFloorplanLabel('basic')).toBe('Basic');
        expect(getFloorplanLabel('fpm')).toBe('Custom Page');
    });

    test('should return label with version suffix when odataVersion provided', () => {
        expect(getFloorplanLabel('lrop', '4')).toBe('List Report Page V4');
        expect(getFloorplanLabel('lrop', '2')).toBe('List Report Page V2');
        expect(getFloorplanLabel('alp', '4')).toBe('Analytical List Page V4');
    });

    test('should return templateType as fallback for unknown template without version suffix', () => {
        // defaultValue has no interpolation token so version suffix is never appended for unknown templates
        expect(getFloorplanLabel('unknown-template')).toBe('unknown-template');
        expect(getFloorplanLabel('unknown-template', '4')).toBe('unknown-template');
    });
});
