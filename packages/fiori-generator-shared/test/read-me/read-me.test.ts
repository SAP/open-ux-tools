import path from 'path';
import memFs from 'mem-fs';
import memFsEditor from 'mem-fs-editor';
import { generateReadMe } from '../../src/read-me';
import type { ReadMe } from '../../src/types';

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
        const readMe: ReadMe = {
            generatorName: '@sap/generator-fiori-elements',
            template: 'List Report Page V4',
            serviceType: 'Local Cap',
            launchText: getLaunchText(),
            generatorVersion: '2.0.1',
            generationDate: 'Jan 01 1975',
            generatorPlatform: 'CLI',
            serviceUrl: 'serviceUrl',
            appName: 'appName',
            appTitle: 'appTitle',
            appDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            ui5Version: '1.2.3',
            appNamespace: 'appNamespace',
            additionalEntries: [
                { label: 'Generator Specific Label A', value: 'Generator Specific Value A' },
                { label: 'Generator Specific Label B', value: 'Generator Specific Value B' }
            ],
            enableEslint: false,
            enableTypeScript: false,
            enableCodeAssist: false
        };
        generateReadMe(__dirname, readMe, editor);
        expect(editor.read(readMePath)).toMatchSnapshot();
    });

    it('should generate README.md with core properties', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const readMe: ReadMe = {
            generatorName: '@sap/generator-fiori-elements',
            template: 'List Report Page V4',
            generatorVersion: '2.0.1',
            appName: 'appName',
            appTitle: 'appTitle',
            appDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            ui5Version: '1.2.3',
            appNamespace: 'appNamespace'
        };
        generateReadMe(__dirname, readMe, editor);
        expect(editor.read(readMePath)).toMatchSnapshot();
    });
});
