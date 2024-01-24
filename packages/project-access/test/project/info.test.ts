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

    test('Type SAPUI5 freestyle in CAP', async () => {
        const appType = await getAppType(join(sampleRoot, 'CAP/CAPNode_mix/app/freestyle'));
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
        expect(Object.keys(project.apps).length).toBe(2);
        expect(project.apps['apps/one'].appRoot).toBe(join(projectRoot, 'apps/one'));
        expect(project.apps['apps/one'].manifest).toBe(join('source/webapp/manifest.json'));
        expect(project.apps['apps/one'].changes).toBe(join('source/webapp/changes'));
        expect(project.apps['apps/one'].i18n?.['sap.app']).toBe(join('source/webapp/i18n/i18n.properties'));
        expect(project.apps['apps/one'].i18n?.['sap.ui5']).toBe(join('source/webapp/ovp/i18n/i18n.properties'));
        expect(project.apps['apps/one'].mainService).toBe('mainService');
        expect(Object.keys(project.apps['apps/one'].services).length).toBe(2);
        expect(project.apps['apps/one'].services.mainService.uri).toBe('/sap/opu/odata/sap/ODATA_SERVICE/');
        expect(project.apps['apps/one'].services.mainService.local).toBe(
            join('apps/one/source/webapp/localService/mainService/metadata.xml')
        );
        expect(project.apps['apps/one'].services.mainService.odataVersion).toBe('2.0');
        expect(project.apps['apps/one'].services.mainService.annotations).toEqual([
            {
                'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='ODATA_SERVICE',Version='0001')/$value/",
                'local': join('apps/one/source/webapp/localService/mainService/ANNOTATION_ONE.xml')
            },
            {
                'uri': 'annotations/ANNOTATION_TWO.xml',
                'local': join('apps/one/source/webapp/annotations/ANNOTATION_TWO.xml')
            }
        ]);
        expect(project.apps['apps/one'].services.ODATA_SERVICE_2.uri).toBe('/sap/opu/odata/sap/ODATA_SERVICE_2');
        expect(project.apps['apps/one'].services.ODATA_SERVICE_2.local).toBe(
            join('apps/one/source/webapp/localService/ODATA_SERVICE_2/metadata.xml')
        );
        expect(project.apps['apps/one'].services.ODATA_SERVICE_2.odataVersion).toBe('2.0');
        expect(project.apps['apps/one'].services.ODATA_SERVICE_2.annotations).toEqual([
            {
                'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='ODATA_SERVICE_2',Version='0001')/$value/",
                'local': join('apps/one/source/webapp/localService/ODATA_SERVICE_2/ODATA_SERVICE_2_Annotation.xml')
            }
        ]);
        expect(project.apps['apps/two'].appRoot).toBe(join(projectRoot, 'apps/two'));
        expect(project.apps['apps/two'].manifest).toBe(join('webapp/manifest.json'));
        expect(project.apps['apps/two'].changes).toBe(join('webapp/changes'));
        expect(project.apps['apps/two'].i18n?.['sap.app']).toBe(join('webapp/i18n/i18n.properties'));
        expect(project.apps['apps/two'].i18n?.['sap.ui5']).toBeUndefined();
        expect(project.apps['apps/two'].mainService).toBe('main');
        expect(Object.keys(project.apps['apps/two'].services).length).toBe(1);
        expect(project.apps['apps/two'].services.main.uri).toBe('/sap/opu/odata4/dmo/ODATA_SERVICE/');
        expect(project.apps['apps/two'].services.main.local).toBe(join('apps/two/webapp/localService/metadata.xml'));
        expect(project.apps['apps/two'].services.main.odataVersion).toBe('4.0');
        expect(project.apps['apps/two'].services.main.annotations).toEqual([
            {
                'uri': 'annotations/annotation.xml',
                'local': join('apps/two/webapp/annotations/annotation.xml')
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
                'appRoot': join(
                    '/Users/d045154/git/github.com/SAP/open-ux-tools/packages/project-access/test/test-data/project/info/empty-project'
                ),
                'manifest': join('webapp/manifest.json'),
                'changes': join('webapp/changes'),
                'i18n': {
                    'sap.app': join('webapp/i18n/i18n.properties')
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
            'apps': {},
            'projectType': 'EDMXBackend'
        });
    });
});
