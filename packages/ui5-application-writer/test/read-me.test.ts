import path from 'path';
import memFs from 'mem-fs';
import memFsEditor from 'mem-fs-editor';
import { generateReadMe } from '../src/options';
import { readFileSync } from 'fs';
import { t } from '../src/i18n';
import type { ReadMe } from '../src/types';

function getLaunchText(mvnCommand: string, capUrl: string): string {
    return `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`;
}

describe('Readme file generation tests', () => {
    const store = memFs.create();
    const editor = memFsEditor.create(store);

    it('should generate README.md with the correct content including core and optional properties', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const expectReadMePath = path.join(__dirname, './expected/test01/README.md');
        const mvnCommand = ' (```mvn spring-boot:run```)',
            capUrl = `http://localhost:8080/someProjectName/webapp/index.html`;
        const readMe: ReadMe = {
            genId: '@sap/generator-fiori-elements',
            templateLabel: 'List Report Page V4',
            dataSourceLabel: 'Local Cap',
            launchText: getLaunchText(mvnCommand, capUrl),
            genVersion: '2.0.1',
            genDate: 'Jan 01 1975',
            genPlatform: 'CLI',
            projectName: 'someProjectName',
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            additionalEntries: [
                { label: 'Generator Specific Label A', value: 'Generator Specific Value A' },
                { label: 'Generator Specific Label B', value: 'Generator Specific Value B' }
            ],
            enableEslint: false,
            enableTypeScript: false,
            enableCodeAssist: false
        };
        generateReadMe(__dirname, readMe, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(expectReadMePath, 'utf-8'));
    });

    it('should generate README.md with default values', () => {
        const readMePath = path.join(__dirname, '/README.md');
        const expectReadMePath = path.join(__dirname, './expected/test02/README.md');
        const readMe: ReadMe = {
            genId: '@sap/generator-fiori-elements',
            templateLabel: 'List Report Page V4',
            dataSourceLabel: 'Local Cap',
            genVersion: '2.0.1',
            projectName: 'someProjectName',
            projectTitle: 'someProjectTitle',
            projectDescription: 'Fiori project description',
            ui5Theme: 'a_ui5_theme',
            projectUI5Version: '1.2.3',
            projectNamespace: 'projectNamespace',
            genDate: 'Jan 01 1975',
            enableEslint: false,
            enableTypeScript: false,
            enableCodeAssist: false
        };
        generateReadMe(__dirname, readMe, editor);
        expect(editor.read(readMePath)).toEqual(readFileSync(expectReadMePath, 'utf-8'));
    });
});
