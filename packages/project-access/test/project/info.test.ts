import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getAppProgrammingLanguage, getAppType, getProject, getProjectType } from '../../src';

describe('Test getAppProgrammingLanguage()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/info');
    test('Detect TypeScript app, no mem-fs', async () => {
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'typescript-app'))).toBe('TypeScript');
    });

    test('Detect JavaScript app, no mem-fs', async () => {
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'javascript-app'))).toBe('JavaScript');
    });

    test('Detect app language, .ts file deleted in mem-fs, no app language', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'typescript-app/webapp/index.ts'));
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'typescript-app'), fs)).toBe('');
    });

    test('Detect app language, no webapp folder', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'javascript-app/webapp'));
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'javascript-app'), fs)).toBe('');
    });
});

describe('Test getProjectType()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/find-all-apps');

    test('Type EDMXBackend', async () => {
        const projectType = await getProjectType(join(sampleRoot, 'single_apps/fiori_elements'));
        expect(projectType).toBe('EDMXBackend');
    });

    test('Type CAPJava', async () => {
        const projectType = await getProjectType(join(sampleRoot, 'CAP/CAPJava_mix'));
        expect(projectType).toBe('CAPJava');
    });

    test('Type CAPNodejs', async () => {
        const projectType = await getProjectType(join(sampleRoot, 'CAP/CAPnode_mix'));
        expect(projectType).toBe('CAPNodejs');
    });
});

describe('Test getAppType()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/find-all-apps');

    test('Type Fiori elements', async () => {
        const appType = await getAppType(join(sampleRoot, 'single_apps/fiori_elements'));
        expect(appType).toBe('SAP Fiori elements');
    });

    test('Type Fiori elements in CAP', async () => {
        const appType = await getAppType(join(sampleRoot, 'CAP/CAPJava_mix/app/fiori_elements'));
        expect(appType).toBe('SAP Fiori elements');
    });

    test('Type SAPUI5 freestyle', async () => {
        const appType = await getAppType(join(sampleRoot, 'single_apps/freestyle'));
        expect(appType).toBe('SAPUI5 freestyle');
    });

    test('Type SAPUI5 freestyle in CAP', async () => {
        const appType = await getAppType(join(sampleRoot, 'CAP/CAPJava_freestyle/app/freestyle'));
        expect(appType).toBe('SAPUI5 freestyle');
    });

    test('Type SAPUI5 freestyle in mixed CAP project', async () => {
        const appType = await getAppType(join(sampleRoot, 'CAP/CAPnode_mix/app/freestyle'));
        expect(appType).toBe('SAPUI5 freestyle');
    });

    test('Type Extension', async () => {
        const appType = await getAppType(join(sampleRoot, 'extensions/valid-extension'));
        expect(appType).toBe('SAPUI5 Extension');
    });

    test('Type Reuse', async () => {
        const appType = await getAppType(join(sampleRoot, 'libraries/valid-library'));
        expect(appType).toBe('Fiori Reuse');
    });

    test('Type Adaptation', async () => {
        const appType = await getAppType(join(sampleRoot, 'adaptations/valid-adaptation'));
        expect(appType).toBe('Fiori Adaptation');
    });

    test('Undefined type', async () => {
        const appType = await getAppType(join(sampleRoot, 'adaptations/invalid-adaptation'));
        expect(appType).toBeUndefined();
    });
});

describe('Test getProject()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/info');

    test('Project information from CAP project', async () => {
        const projectRoot = join(sampleRoot, 'cap-project');
        const project = await getProject(projectRoot);

        expect(project.root).toBe(projectRoot);
        expect(project.projectType).toBe('CAPNodejs');
        expect(Object.keys(project.apps).length).toBe(3);

        const appOne = project.apps[join('apps/one')];
        expect(appOne.appRoot).toBe(join(projectRoot, 'apps/one'));
        expect(appOne.manifest).toBe(join(appOne.appRoot, 'source/webapp/manifest.json'));
        expect(appOne.changes).toBe(join(appOne.appRoot, 'source/webapp/changes'));
        expect(appOne.i18n['sap.app']).toBe(join(appOne.appRoot, 'source/webapp/i18n/i18n.properties'));
        expect(appOne.i18n.models['i18n']).toEqual({
            path: join(appOne.appRoot, 'source/webapp/ovp/i18n/i18n.properties')
        });
        expect(appOne.i18n.models['@i18n']).toEqual({
            path: join(appOne.appRoot, 'source/webapp/i18n/i18n.properties')
        });
        expect(appOne.mainService).toBe('mainService');
        expect(Object.keys(appOne.services).length).toBe(2);
        expect(appOne.services.mainService.uri).toBe('/sap/opu/odata/sap/ODATA_SERVICE/');
        expect(appOne.services.mainService.local).toBe(
            join(appOne.appRoot, 'source/webapp/localService/mainService/metadata.xml')
        );
        expect(appOne.services.mainService.odataVersion).toBe('2.0');
        expect(appOne.services.mainService.annotations).toEqual([
            {
                'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='ODATA_SERVICE',Version='0001')/$value/",
                'local': join(appOne.appRoot, 'source/webapp/localService/mainService/ANNOTATION_ONE.xml')
            },
            {
                'uri': 'annotations/ANNOTATION_TWO.xml',
                'local': join(appOne.appRoot, 'source/webapp/annotations/ANNOTATION_TWO.xml')
            }
        ]);
        expect(appOne.services.ODATA_SERVICE_2.uri).toBe('/sap/opu/odata/sap/ODATA_SERVICE_2');
        expect(appOne.services.ODATA_SERVICE_2.local).toBe(
            join(appOne.appRoot, 'source/webapp/localService/ODATA_SERVICE_2/metadata.xml')
        );
        expect(appOne.services.ODATA_SERVICE_2.odataVersion).toBe('2.0');
        expect(appOne.services.ODATA_SERVICE_2.annotations).toEqual([
            {
                'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='ODATA_SERVICE_2',Version='0001')/$value/",
                'local': join(
                    appOne.appRoot,
                    'source/webapp/localService/ODATA_SERVICE_2/ODATA_SERVICE_2_Annotation.xml'
                )
            }
        ]);

        const appTwo = project.apps[join('apps/two')];
        expect(appTwo.appRoot).toBe(join(projectRoot, 'apps/two'));
        expect(appTwo.manifest).toBe(join(appTwo.appRoot, 'webapp/manifest.json'));
        expect(appTwo.changes).toBe(join(appTwo.appRoot, 'webapp/changes'));
        expect(appTwo.i18n['sap.app']).toEqual(join(appTwo.appRoot, 'webapp/i18n/i18n.properties'));
        expect(appTwo.i18n.models.i18n).toBeUndefined();
        expect(appTwo.mainService).toBe('main');
        expect(Object.keys(appTwo.services).length).toBe(1);
        expect(appTwo.services.main.uri).toBe('/sap/opu/odata4/dmo/ODATA_SERVICE/');
        expect(appTwo.services.main.local).toBe(join(appTwo.appRoot, 'webapp/localService/metadata.xml'));
        expect(appTwo.services.main.odataVersion).toBe('4.0');
        expect(appTwo.services.main.annotations).toEqual([
            {
                'uri': 'annotations/annotation.xml',
                'local': join(appTwo.appRoot, 'webapp/annotations/annotation.xml')
            }
        ]);

        const appFreestyle = project.apps[join('apps/freestyle')];
        expect(appFreestyle.appRoot).toBe(join(projectRoot, 'apps/freestyle'));
        expect(appFreestyle.manifest).toBe(join(appFreestyle.appRoot, 'webapp/manifest.json'));
        expect(appFreestyle.changes).toBe(join(appFreestyle.appRoot, 'webapp/changes'));
        expect(appFreestyle.i18n['sap.app']).toEqual(join(appFreestyle.appRoot, 'webapp/i18n/i18n.properties'));
        expect(appFreestyle.i18n.models.i18n).toBeUndefined();
        expect(appFreestyle.mainService).toBe('main');
        expect(Object.keys(appFreestyle.services).length).toBe(1);
        expect(appFreestyle.services.main.uri).toBe('/sap/opu/odata4/dmo/ODATA_SERVICE/');
        expect(appFreestyle.services.main.local).toBe(join(appFreestyle.appRoot, 'webapp/localService/metadata.xml'));
        expect(appFreestyle.services.main.odataVersion).toBe('4.0');
        expect(appFreestyle.services.main.annotations).toEqual([
            {
                'uri': 'annotations/annotation.xml',
                'local': join(appFreestyle.appRoot, 'webapp/annotations/annotation.xml')
            }
        ]);
    });

    test('Project information from empty project', async () => {
        const projectRoot = join(sampleRoot, 'empty-project');
        const project = await getProject(projectRoot);

        expect(project.root).toBe(projectRoot);
        expect(project.projectType).toBe('EDMXBackend');
        expect(Object.keys(project.apps).length).toBe(1);
        expect(project.apps).toEqual({
            '': {
                'appRoot': projectRoot,
                'manifest': join(projectRoot, 'webapp/manifest.json'),
                'changes': join(projectRoot, 'webapp/changes'),
                'i18n': {
                    'sap.app': join(projectRoot, 'webapp/i18n/i18n.properties'),
                    models: {}
                },
                'services': {}
            }
        });
    });

    test('Project without manifest.json', async () => {
        const projectRoot = join(sampleRoot, 'no-manifest');
        const project = await getProject(projectRoot);

        expect(project).toEqual({
            'root': projectRoot,
            'projectType': 'EDMXBackend',
            'apps': {}
        });
    });
});
