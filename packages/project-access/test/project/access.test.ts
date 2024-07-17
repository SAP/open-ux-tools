import { join } from 'path';
import type { Manifest, Package } from '../../src';
import { createApplicationAccess, createProjectAccess } from '../../src';
import * as i18nMock from '../../src/project/i18n/write';
import * as specMock from '../../src/project/specification';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { promises } from 'fs';

describe('Test function createApplicationAccess()', () => {
    const memFs = create(createStorage());
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    const sampleRoot = join(__dirname, '../test-data/project/info');

    test('App as part of a CAP project', async () => {
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/two');
        const appAccess = await createApplicationAccess(appRoot);

        expect(appAccess).toBeDefined();
        expect(appAccess.root).toBe(projectRoot);
        expect(appAccess.projectType).toBe('CAPNodejs');
        expect(appAccess.getAppId()).toBe(join('apps/two'));
        expect(appAccess.getAppRoot()).toBe(appRoot);
        expect(Object.keys(appAccess.project.apps).sort()).toEqual(
            [join('apps/one'), join('apps/two'), join('apps/freestyle')].sort()
        );
    });

    test('Standalone app', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const appAccess = await createApplicationAccess(appRoot);
        expect(appAccess.root).toBe(appRoot);
        expect(appAccess.projectType).toBe('EDMXBackend');
        expect(appAccess.getAppId()).toBe('');
        expect(appAccess.getAppRoot()).toBe(appRoot);
    });

    test('Read access to i18n of standalone app', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const appAccess = await createApplicationAccess(appRoot);
        const i18nBundles = await appAccess.getI18nBundles();
        const i18nPropertiesPaths = await appAccess.getI18nPropertiesPaths();
        const app = i18nBundles['sap.app'];
        expect(app.testTextKey[0].key.value).toBe('testTextKey');
        expect(app.testTextKey[0].value.value).toBe('Test Text Value');
        expect(app.testTextKey[0].annotation?.textType.value).toBe(' Test comment');
        expect(i18nPropertiesPaths).toEqual({
            'sap.app': join(appRoot, 'webapp/i18n/i18n.properties'),
            'models': {
                '@i18n': {
                    'path': join(appRoot, 'webapp/i18n/i18n.properties')
                },
                'modelKey': {
                    'path': join(appRoot, 'webapp/i18n/i18n.properties')
                }
            }
        });
    });
    test('Read access to i18n of standalone app - mem-fs-editor', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const appAccess = await createApplicationAccess(appRoot, memFs);
        const i18nBundles = await appAccess.getI18nBundles();
        const i18nPropertiesPaths = await appAccess.getI18nPropertiesPaths();
        const app = i18nBundles['sap.app'];
        expect(app.testTextKey[0].key.value).toBe('testTextKey');
        expect(app.testTextKey[0].value.value).toBe('Test Text Value');
        expect(app.testTextKey[0].annotation?.textType.value).toBe(' Test comment');
        expect(i18nPropertiesPaths).toEqual({
            'sap.app': join(appRoot, 'webapp/i18n/i18n.properties'),
            'models': {
                '@i18n': {
                    'path': join(appRoot, 'webapp/i18n/i18n.properties')
                },
                'modelKey': {
                    'path': join(appRoot, 'webapp/i18n/i18n.properties')
                }
            }
        });
    });

    test('Write access to i18n of standalone app (mocked)', async () => {
        // Mock setup
        const createAnnotationI18nEntriesMock = jest
            .spyOn(i18nMock, 'createAnnotationI18nEntries')
            .mockResolvedValue(true);
        const createUI5I18nEntriesMock = jest.spyOn(i18nMock, 'createUI5I18nEntries').mockResolvedValue(true);
        const createManifestI18nEntriesMock = jest.spyOn(i18nMock, 'createManifestI18nEntries').mockResolvedValue(true);
        const appRoot = join(sampleRoot, 'fiori_elements');

        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.createAnnotationI18nEntries([
            {
                key: 'newKey',
                value: 'newValue',
                annotation: 'newAnnotation'
            }
        ]);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }], 'modelKey');
        await appAccess.createManifestI18nEntries([
            { key: '1', value: '1v' },
            { key: '2', value: '2v' }
        ]);

        // Result check
        expect(createAnnotationI18nEntriesMock).toBeCalledWith(
            appRoot,
            join(appRoot, 'webapp/manifest.json'),
            appAccess.project.apps[''].i18n,
            [
                {
                    key: 'newKey',
                    value: 'newValue',
                    annotation: 'newAnnotation'
                }
            ],
            undefined
        );
        expect(createUI5I18nEntriesMock).toBeCalledWith(
            appRoot,
            appAccess.project.apps[''].manifest,
            appAccess.project.apps[''].i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'modelKey',
            undefined
        );
        expect(createManifestI18nEntriesMock).toBeCalledWith(
            appRoot,
            appAccess.app.i18n,
            [
                { key: '1', value: '1v' },
                { key: '2', value: '2v' }
            ],
            undefined
        );
    });
    test('Write access to i18n of standalone app - mem-fs-editor (mocked)', async () => {
        // Mock setup
        const createAnnotationI18nEntriesMock = jest
            .spyOn(i18nMock, 'createAnnotationI18nEntries')
            .mockResolvedValue(true);
        const createUI5I18nEntriesMock = jest.spyOn(i18nMock, 'createUI5I18nEntries').mockResolvedValue(true);
        const createManifestI18nEntriesMock = jest.spyOn(i18nMock, 'createManifestI18nEntries').mockResolvedValue(true);
        const appRoot = join(sampleRoot, 'fiori_elements');

        // Test execution
        const appAccess = await createApplicationAccess(appRoot, { fs: memFs });
        await appAccess.createAnnotationI18nEntries([
            {
                key: 'newKey',
                value: 'newValue',
                annotation: 'newAnnotation'
            }
        ]);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }], 'modelKey');
        await appAccess.createManifestI18nEntries([
            { key: '1', value: '1v' },
            { key: '2', value: '2v' }
        ]);

        // Result check
        expect(createAnnotationI18nEntriesMock).toBeCalledWith(
            appRoot,
            join(appRoot, 'webapp/manifest.json'),
            appAccess.project.apps[''].i18n,
            [
                {
                    key: 'newKey',
                    value: 'newValue',
                    annotation: 'newAnnotation'
                }
            ],
            memFs
        );
        expect(createUI5I18nEntriesMock).toBeCalledWith(
            appRoot,
            appAccess.project.apps[''].manifest,
            appAccess.project.apps[''].i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'modelKey',
            memFs
        );
        expect(createManifestI18nEntriesMock).toBeCalledWith(
            appRoot,
            appAccess.app.i18n,
            [
                { key: '1', value: '1v' },
                { key: '2', value: '2v' }
            ],
            memFs
        );
    });

    test('Write access to i18n of app in CAP project (mocked)', async () => {
        // Mock setup
        const createCapI18nEntriesMock = jest.spyOn(i18nMock, 'createCapI18nEntries').mockResolvedValue(true);
        const createUI5I18nEntriesMock = jest.spyOn(i18nMock, 'createUI5I18nEntries').mockResolvedValue(true);
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const appAccess = await createApplicationAccess(appRoot);

        // Test execution
        await appAccess.createCapI18nEntries('filePath', []);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }]);

        // Result check
        expect(createCapI18nEntriesMock).toBeCalledWith(projectRoot, 'filePath', [], undefined);
        expect(createUI5I18nEntriesMock).toBeCalledWith(
            projectRoot,
            appAccess.app.manifest,
            appAccess.app.i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'i18n',
            undefined
        );
    });
    test('Write access to i18n of app in CAP project - mem-fs-editor (mocked)', async () => {
        // Mock setup
        const createCapI18nEntriesMock = jest.spyOn(i18nMock, 'createCapI18nEntries').mockResolvedValue(true);
        const createUI5I18nEntriesMock = jest.spyOn(i18nMock, 'createUI5I18nEntries').mockResolvedValue(true);
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const appAccess = await createApplicationAccess(appRoot, memFs);

        // Test execution
        await appAccess.createCapI18nEntries('filePath', []);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }], 'i18n');

        // Result check
        expect(createCapI18nEntriesMock).toBeCalledWith(projectRoot, 'filePath', [], memFs);
        expect(createUI5I18nEntriesMock).toBeCalledWith(
            projectRoot,
            appAccess.app.manifest,
            appAccess.app.i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'i18n',
            memFs
        );
    });

    test('Update package.json of standalone app (mocked)', async () => {
        // Mock setup
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { sapux: false } as unknown as Package;
        const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
        const pckgPath = join(appRoot, 'package.json');
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent);
        // Result check
        expect(writeFileSpy).toBeCalledWith(pckgPath, '{\n    "sapux": false\n}\n', { encoding: 'utf8' });
    });

    test('Update package.json of standalone app - mem-fs-editor (mocked)', async () => {
        // Mock setup
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { sapux: false } as unknown as Package;
        const pckgPath = join(appRoot, 'package.json');
        memFs.writeJSON(pckgPath, { sapux: true }, undefined, 4);
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent, memFs);
        // Result check
        const result = memFs.read(pckgPath);
        expect(result).toBe('{\n    "sapux": false\n}\n');
    });

    test('Update package.json of app in CAP project (mocked)', async () => {
        // Mock setup
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const updateFileContent = { name: 'two' } as unknown as Package;
        const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
        const pckgPath = join(appRoot, 'package.json');
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent);
        // Result check
        expect(writeFileSpy).toBeCalledWith(pckgPath, '{\n    "name": "two"\n}\n', { encoding: 'utf8' });
    });

    test('Update package.json of app in CAP project - mem-fs-editor (mocked)', async () => {
        // Mock setup
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const updateFileContent = { name: 'two' } as unknown as Package;
        const pckgPath = join(appRoot, 'package.json');
        memFs.writeJSON(pckgPath, { name: 'one' }, undefined, 4);
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent, memFs);
        // Result check
        const result = memFs.read(pckgPath);
        expect(result).toBe('{\n    "name": "two"\n}\n');
    });

    test('Update manifest.json of standalone app (mocked)', async () => {
        // Mock setup
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { 'sap.app': {} } as unknown as Manifest;
        const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
        const manifestPath = join(appRoot, 'webapp', 'manifest.json');
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updateManifestJSON(updateFileContent);
        // Result check
        expect(writeFileSpy).toBeCalledWith(manifestPath, '{\n    "sap.app": {}\n}\n', { encoding: 'utf8' });
    });

    test('Update manifest.json of standalone app - mem-fs-editor (mocked)', async () => {
        // Mock setup
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { 'sap.app': {} } as unknown as Manifest;
        const manifestPath = join(appRoot, 'webapp', 'manifest.json');
        memFs.writeJSON(manifestPath, { 'sap.app': { id: 'single_apps-fiori_elements' } }, undefined, 4);
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updateManifestJSON(updateFileContent, memFs);
        // Result check
        const result = memFs.read(manifestPath);
        expect(result).toBe('{\n    "sap.app": {}\n}\n');
    });

    test('Get instance of specification (mocked)', async () => {
        // Mock setup
        const appRoot = join(sampleRoot, 'fiori_elements');
        jest.spyOn(specMock, 'getSpecification').mockResolvedValueOnce({ test: 'specification' });
        // Test execution
        const appAccess = await createApplicationAccess(appRoot);
        const spec = await appAccess.getSpecification();
        // Result check
        expect(spec).toEqual({ test: 'specification' });
    });

    test('Error handling for non existing app', async () => {
        try {
            await createApplicationAccess('non-existing-app');
            expect('Call to createApplicationAccess() should have thrown error but did not').toEqual(true);
        } catch (error) {
            expect(error.message).toContain('non-existing-app');
        }
    });
});

describe('Test function createProjectAccess()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/info');

    test('CAP project', async () => {
        const projectRoot = join(sampleRoot, 'cap-project');
        const projectAccess = await createProjectAccess(projectRoot);
        expect(projectAccess).toBeDefined();
        expect(projectAccess.root).toBe(projectRoot);
        expect(projectAccess.projectType).toBe('CAPNodejs');
        expect(projectAccess.getApplicationIds().sort()).toEqual(
            [join('apps/one'), join('apps/two'), join('apps/freestyle')].sort()
        );
        expect(projectAccess.getApplication(join('apps/one')).getAppId()).toBe(join('apps/one'));
    });

    test('Standalone app', async () => {
        const projectRoot = join(sampleRoot, 'fiori_elements');
        const projectAccess = await createProjectAccess(projectRoot);
        expect(projectAccess.root).toBe(projectRoot);
        expect(projectAccess.projectType).toBe('EDMXBackend');
        expect(projectAccess.getApplicationIds()).toEqual(['']);
    });

    test('Error handling for non existing project', async () => {
        try {
            await createProjectAccess('non-existing-project');
            expect('Call to createProjectAccess() should have thrown error but did not').toEqual(true);
        } catch (error) {
            expect(error.message).toContain('non-existing-project');
        }
    });

    test('Error handling for non existing app in project', async () => {
        try {
            const projectRoot = join(sampleRoot, 'cap-project');
            const projectAccess = await createProjectAccess(projectRoot);
            projectAccess.getApplication('non-existing-app');
            expect('Call to getApplication() should have thrown error but did not').toEqual(true);
        } catch (error) {
            expect(error.message).toContain('non-existing-app');
        }
    });
});
