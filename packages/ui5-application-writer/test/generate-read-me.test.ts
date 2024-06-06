import path, { join } from 'path';
import memFs from 'mem-fs';
import memFsEditor from 'mem-fs-editor';
import { composeReadMe, getDataSourceLabel, getLaunchText, generateReadMe } from '../src/read-me/index';
import { CAP_RUNTIME } from '../src/read-me/types';
import { OdataVersion, DatasourceType } from '@sap-ux/odata-service-inquirer';
import { ApplyTemplateFunction, ReadMe } from '../src/read-me/types';
import { readFileSync } from 'fs';

const enum GeneratorName {
    FE = '@sap/generator-fiori-elements',
    FF = '@sap/generator-fiori-freestyle'
}

describe('Readme file tests', () => {
    const store = memFs.create();
    const editor = memFsEditor.create(store);

    const readMePath = path.join(__dirname, '/README.md');
    const readMeTemplatePath = path.join(__dirname, '..', 'templates', 'README.md');
    const expectReadMePath = path.join(__dirname, './expected/test04/README.md');
    const realJoin = path.join;

    const mockJoin = jest.spyOn(path, 'join');

    it('Generate - generateReadMe', () => {
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

        const service = {
            version: OdataVersion.v4,
            source: DatasourceType.capProject,
            capService: {
                capType: CAP_RUNTIME.JAVA,
                //projectPath: 'a/b/c',
                //serviceName: 'cap_service_name'
            }
        };
  
        const platformName = 'CLI'
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
            dataSourceLabel: getDataSourceLabel(DatasourceType.capProject, "",true),
            launchText: getLaunchText(service.capService.capType, projectName, genId)
        }

        generateReadMe(__dirname, config, editor);
        //expect(editor.exists(readMePath)).toBeTrue();
        expect(editor.read(readMePath)).toEqual(readFileSync(expectReadMePath, 'utf-8'));
    });
});
  