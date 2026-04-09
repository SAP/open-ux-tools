import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Manifest, Package } from '../../src';
import type * as i18nWriteType from '../../src/project/i18n/write';
import type * as specType from '../../src/project/specification';
import type * as capType from '../../src/project/cap';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { promises } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const mockCreateAnnotationI18nEntries = jest.fn<typeof i18nWriteType.createAnnotationI18nEntries>();
const mockCreateUI5I18nEntries = jest.fn<typeof i18nWriteType.createUI5I18nEntries>();
const mockCreateManifestI18nEntries = jest.fn<typeof i18nWriteType.createManifestI18nEntries>();
const mockCreateCapI18nEntries = jest.fn<typeof i18nWriteType.createCapI18nEntries>();
const mockGetSpecification = jest.fn<typeof specType.getSpecification>();
const mockReadCapServiceMetadataEdmx = jest.fn<typeof capType.readCapServiceMetadataEdmx>();

// Set up all mocks BEFORE loading any source modules
jest.unstable_mockModule('../../src/project/i18n/write', () => ({
    createAnnotationI18nEntries: mockCreateAnnotationI18nEntries,
    createUI5I18nEntries: mockCreateUI5I18nEntries,
    createManifestI18nEntries: mockCreateManifestI18nEntries,
    createCapI18nEntries: mockCreateCapI18nEntries
}));

const realSpec = await import('../../src/project/specification');
jest.unstable_mockModule('../../src/project/specification', () => ({
    ...realSpec,
    getSpecification: mockGetSpecification
}));

// Load real cap module first (this also loads search.ts due to circular dep)
const realCap = await import('../../src/project/cap');
jest.unstable_mockModule('../../src/project/cap', () => ({
    ...realCap,
    readCapServiceMetadataEdmx: mockReadCapServiceMetadataEdmx
}));

const { createApplicationAccess, createProjectAccess } = await import('../../src');
const { readFile, readJSON } = await import('../../src/file');

describe('Test function createApplicationAccess()', () => {
    let memFs: Editor;

    beforeEach(() => {
        jest.restoreAllMocks();
        mockCreateAnnotationI18nEntries.mockReset();
        mockCreateUI5I18nEntries.mockReset();
        mockCreateManifestI18nEntries.mockReset();
        mockCreateCapI18nEntries.mockReset();
        mockGetSpecification.mockReset();
        mockReadCapServiceMetadataEdmx.mockReset();
        memFs = create(createStorage());
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
        mockCreateAnnotationI18nEntries.mockResolvedValue(true);
        mockCreateUI5I18nEntries.mockResolvedValue(true);
        mockCreateManifestI18nEntries.mockResolvedValue(true);
        const appRoot = join(sampleRoot, 'fiori_elements');

        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.createAnnotationI18nEntries([
            { key: 'newKey', value: 'newValue', annotation: 'newAnnotation' }
        ]);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }], 'modelKey');
        await appAccess.createManifestI18nEntries([
            { key: '1', value: '1v' },
            { key: '2', value: '2v' }
        ]);

        expect(mockCreateAnnotationI18nEntries).toHaveBeenCalledWith(
            appRoot,
            join(appRoot, 'webapp/manifest.json'),
            appAccess.project.apps[''].i18n,
            [{ key: 'newKey', value: 'newValue', annotation: 'newAnnotation' }],
            undefined
        );
        expect(mockCreateUI5I18nEntries).toHaveBeenCalledWith(
            appRoot,
            appAccess.project.apps[''].manifest,
            appAccess.project.apps[''].i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'modelKey',
            undefined
        );
        expect(mockCreateManifestI18nEntries).toHaveBeenCalledWith(
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
        mockCreateAnnotationI18nEntries.mockResolvedValue(true);
        mockCreateUI5I18nEntries.mockResolvedValue(true);
        mockCreateManifestI18nEntries.mockResolvedValue(true);
        const appRoot = join(sampleRoot, 'fiori_elements');

        const appAccess = await createApplicationAccess(appRoot, { fs: memFs });
        await appAccess.createAnnotationI18nEntries([
            { key: 'newKey', value: 'newValue', annotation: 'newAnnotation' }
        ]);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }], 'modelKey');
        await appAccess.createManifestI18nEntries([
            { key: '1', value: '1v' },
            { key: '2', value: '2v' }
        ]);

        expect(mockCreateAnnotationI18nEntries).toHaveBeenCalledWith(
            appRoot,
            join(appRoot, 'webapp/manifest.json'),
            appAccess.project.apps[''].i18n,
            [{ key: 'newKey', value: 'newValue', annotation: 'newAnnotation' }],
            memFs
        );
        expect(mockCreateUI5I18nEntries).toHaveBeenCalledWith(
            appRoot,
            appAccess.project.apps[''].manifest,
            appAccess.project.apps[''].i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'modelKey',
            memFs
        );
        expect(mockCreateManifestI18nEntries).toHaveBeenCalledWith(
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
        mockCreateCapI18nEntries.mockResolvedValue(true);
        mockCreateUI5I18nEntries.mockResolvedValue(true);
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const appAccess = await createApplicationAccess(appRoot);

        await appAccess.createCapI18nEntries('filePath', []);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }]);

        expect(mockCreateCapI18nEntries).toHaveBeenCalledWith(projectRoot, 'filePath', [], undefined);
        expect(mockCreateUI5I18nEntries).toHaveBeenCalledWith(
            projectRoot,
            appAccess.app.manifest,
            appAccess.app.i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'i18n',
            undefined
        );
    });

    test('Write access to i18n of app in CAP project - mem-fs-editor (mocked)', async () => {
        mockCreateCapI18nEntries.mockResolvedValue(true);
        mockCreateUI5I18nEntries.mockResolvedValue(true);
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps', 'one');
        const appAccess = await createApplicationAccess(appRoot, memFs);

        await appAccess.createCapI18nEntries('filePath', []);
        await appAccess.createUI5I18nEntries([{ key: 'one', value: 'two', annotation: 'three' }], 'i18n');

        expect(mockCreateCapI18nEntries).toHaveBeenCalledWith(projectRoot, 'filePath', [], memFs);
        expect(mockCreateUI5I18nEntries).toHaveBeenCalledWith(
            projectRoot,
            appAccess.app.manifest,
            appAccess.app.i18n,
            [{ key: 'one', value: 'two', annotation: 'three' }],
            'i18n',
            memFs
        );
    });

    test('Update package.json of standalone app (mocked)', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { sapux: false } as unknown as Package;
        const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
        const pckgPath = join(appRoot, 'package.json');
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent);
        expect(writeFileSpy).toHaveBeenCalledWith(pckgPath, '{\n    "sapux": false\n}\n', { encoding: 'utf8' });
    });

    test('Update package.json of standalone app - mem-fs-editor (mocked)', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { sapux: false } as unknown as Package;
        const pckgPath = join(appRoot, 'package.json');
        memFs.writeJSON(pckgPath, { sapux: true }, undefined, 4);
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent, memFs);
        const result = memFs.read(pckgPath);
        expect(result).toBe('{\n    "sapux": false\n}\n');
    });

    test('Update package.json of app in CAP project (mocked)', async () => {
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const updateFileContent = { name: 'two' } as unknown as Package;
        const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
        const pckgPath = join(appRoot, 'package.json');
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent);
        expect(writeFileSpy).toHaveBeenCalledWith(pckgPath, '{\n    "name": "two"\n}\n', { encoding: 'utf8' });
    });

    test('Update package.json of app in CAP project - mem-fs-editor (mocked)', async () => {
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const updateFileContent = { name: 'two' } as unknown as Package;
        const pckgPath = join(appRoot, 'package.json');
        memFs.writeJSON(pckgPath, { name: 'one' }, undefined, 4);
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updatePackageJSON(updateFileContent, memFs);
        const result = memFs.read(pckgPath);
        expect(result).toBe('{\n    "name": "two"\n}\n');
    });

    test('Update package.json of app in CAP project - mem-fs-editor (mocked)', async () => {
        const projectRoot = join(sampleRoot, 'cap-project');
        const appRoot = join(projectRoot, 'apps/one');
        const updateFileContent = { name: 'two' } as unknown as Package;
        const pckgPath = join(appRoot, 'package.json');
        memFs.writeJSON(pckgPath, { name: 'one' }, undefined, 4);
        const appAccess = await createApplicationAccess(appRoot, memFs);
        await appAccess.updatePackageJSON(updateFileContent);
        const result = memFs.read(pckgPath);
        expect(result).toBe('{\n    "name": "two"\n}\n');
    });

    test('Update manifest.json of standalone app (mocked)', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { 'sap.app': {} } as unknown as Manifest;
        const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
        const manifestPath = join(appRoot, 'webapp', 'manifest.json');
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updateManifestJSON(updateFileContent);
        expect(writeFileSpy).toHaveBeenCalledWith(manifestPath, '{\n    "sap.app": {}\n}\n', { encoding: 'utf8' });
    });

    test('Update manifest.json of standalone app - mem-fs-editor (mocked)', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { 'sap.app': {} } as unknown as Manifest;
        const manifestPath = join(appRoot, 'webapp', 'manifest.json');
        memFs.writeJSON(manifestPath, { 'sap.app': { id: 'single_apps-fiori_elements' } }, undefined, 4);
        const appAccess = await createApplicationAccess(appRoot);
        await appAccess.updateManifestJSON(updateFileContent, memFs);
        const result = memFs.read(manifestPath);
        expect(result).toBe('{\n    "sap.app": {}\n}\n');
    });

    test('Update manifest.json of standalone app - mem-fs-editor passed when created', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const updateFileContent = { 'sap.app': {} } as unknown as Manifest;
        const manifestPath = join(appRoot, 'webapp', 'manifest.json');
        memFs.writeJSON(
            manifestPath,
            { 'sap.app': { id: 'single_apps-fiori_elements', type: 'application' } },
            undefined,
            4
        );
        const appAccess = await createApplicationAccess(appRoot, memFs);
        await appAccess.updateManifestJSON(updateFileContent);
        const result = memFs.read(manifestPath);
        expect(result).toBe('{\n    "sap.app": {}\n}\n');
    });

    test('Get instance of specification (mocked)', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        mockGetSpecification.mockResolvedValueOnce({ test: 'specification' });
        const appAccess = await createApplicationAccess(appRoot);
        const spec = await appAccess.getSpecification();
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

    test('Read manifest.json of standalone app without mem-fs', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const appAccess = await createApplicationAccess(appRoot);
        const manifest = await appAccess.readManifest();
        expect(manifest).toEqual(await readJSON(join(appRoot, 'webapp/manifest.json')));
    });

    test('Read manifest.json of standalone app with mem-fs', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const manifestPath = join(appRoot, 'webapp/manifest.json');
        const newManifest = await readJSON<{ dummy: boolean }>(join(appRoot, 'webapp/manifest.json'), memFs);
        newManifest.dummy = true;
        memFs.writeJSON(manifestPath, newManifest, undefined, 4);
        const appAccess = await createApplicationAccess(appRoot);
        const manifest = await appAccess.readManifest(memFs);
        expect('dummy' in manifest ? manifest.dummy : undefined).toEqual(true);
    });

    test('Read manifest.json of standalone app with mem-fs(mem-fs is passed on creation)', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const manifestPath = join(appRoot, 'webapp/manifest.json');
        const newManifest = await readJSON<{ dummy: string }>(join(appRoot, 'webapp/manifest.json'), memFs);
        newManifest.dummy = 'Test';
        memFs.writeJSON(manifestPath, newManifest, undefined, 4);
        const appAccess = await createApplicationAccess(appRoot, memFs);
        const manifest = await appAccess.readManifest();
        expect('dummy' in manifest ? manifest.dummy : undefined).toEqual('Test');
    });

    test('Read flex changes of standalone app without mem-fs - without flex changes', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const appAccess = await createApplicationAccess(appRoot);
        const changes = await appAccess.readFlexChanges();
        expect(Object.keys(changes)).toEqual([]);
    });

    test('Read flex changes of standalone app without mem-fs - with flex changes', async () => {
        const appRoot = join(sampleRoot, 'fiori_elements');
        const appAccess = await createApplicationAccess(appRoot);
        appAccess.app.changes = join(__dirname, '../test-data/project/flex-changes/webapp/changes');
        const changes = await appAccess.readFlexChanges();
        expect(Object.keys(changes)).toEqual([
            'id_1761320220775_1_propertyChange.change',
            'id_1761320220775_2_propertyChange.change'
        ]);
    });

    test('Read flex changes with mem-fs', async () => {
        const changeFileName = 'id_1761320220775_1_propertyChange.change';
        const appRoot = join(sampleRoot, 'fiori_elements');
        const changesPath = join(__dirname, '../test-data/project/flex-changes/webapp/changes');
        const changeFilePath = join(changesPath, changeFileName);
        memFs.write(changeFilePath, '{"dummy": true}');
        const appAccess = await createApplicationAccess(appRoot);
        appAccess.app.changes = changesPath;
        const changes = await appAccess.readFlexChanges(memFs);
        expect(changes[changeFileName]).toEqual('{"dummy": true}');
    });

    test('Read flex changes with mem-fs(mem-fs is passed on creation)', async () => {
        const changeFileName = 'id_1761320220775_1_propertyChange.change';
        const appRoot = join(sampleRoot, 'fiori_elements');
        const changesPath = join(__dirname, '../test-data/project/flex-changes/webapp/changes');
        const changeFilePath = join(changesPath, changeFileName);
        memFs.write(changeFilePath, '{"dummy": "test"}');
        const appAccess = await createApplicationAccess(appRoot, memFs);
        appAccess.app.changes = changesPath;
        const changes = await appAccess.readFlexChanges();
        expect(changes[changeFileName]).toEqual('{"dummy": "test"}');
    });

    describe('readAnnotationFiles', () => {
        test('Read annotation files of standalone EDMX app without mem-fs', async () => {
            const appRoot = join(sampleRoot, 'fiori_elements');
            const appAccess = await createApplicationAccess(appRoot);
            const annotationFiles = await appAccess.readAnnotationFiles();
            expect(annotationFiles.map((annotationFile) => annotationFile.dataSourceUri)).toEqual([
                join(appRoot, 'webapp/localService/metadata.xml'),
                join(appRoot, 'webapp/annotations/annotation.xml')
            ]);
            expect(annotationFiles[0].fileContent.includes('Alias="Measures"')).toBeTruthy();
            expect(annotationFiles[1].fileContent.includes('/catalog-admin-noauth/$metadata')).toBeTruthy();
        });

        test('Read annotation files of standalone EDMX app with mem-fs', async () => {
            const appRoot = join(sampleRoot, 'fiori_elements');
            const expectedFiles = [
                join(appRoot, 'webapp/localService/metadata.xml'),
                join(appRoot, 'webapp/annotations/annotation.xml')
            ];
            memFs.write(expectedFiles[0], 'Test metadata.xml');
            memFs.write(expectedFiles[1], 'Test annotation.xml');
            const appAccess = await createApplicationAccess(appRoot);
            const annotationFiles = await appAccess.readAnnotationFiles(memFs);
            expect(annotationFiles.map((annotationFile) => annotationFile.dataSourceUri)).toEqual(expectedFiles);
            expect(annotationFiles[0].fileContent).toEqual('Test metadata.xml');
            expect(annotationFiles[1].fileContent).toEqual('Test annotation.xml');
        });

        test('Read annotation files of standalone EDMX app with mem-fs(mem-fs is passed on creation)', async () => {
            const appRoot = join(sampleRoot, 'fiori_elements');
            const expectedFiles = [
                join(appRoot, 'webapp/localService/metadata.xml'),
                join(appRoot, 'webapp/annotations/annotation.xml')
            ];
            memFs.write(expectedFiles[0], 'Test2 metadata.xml');
            memFs.write(expectedFiles[1], 'Test2 annotation.xml');
            const manifestPath = join(appRoot, 'webapp/manifest.json');
            const originalManifest = await readJSON<{ dummy: string }>(join(appRoot, 'webapp/manifest.json'));
            memFs.writeJSON(manifestPath, originalManifest, undefined, 4);
            const appAccess = await createApplicationAccess(appRoot, memFs);
            const annotationFiles = await appAccess.readAnnotationFiles();
            expect(annotationFiles.map((annotationFile) => annotationFile.dataSourceUri)).toEqual(expectedFiles);
            expect(annotationFiles[0].fileContent).toEqual('Test2 metadata.xml');
            expect(annotationFiles[1].fileContent).toEqual('Test2 annotation.xml');
        });

        test('Read annotation files of CAP app', async () => {
            const mockedMetadata = await readFile(
                join(sampleRoot, 'fiori_elements', 'webapp/localService/metadata.xml')
            );
            mockReadCapServiceMetadataEdmx.mockResolvedValue(mockedMetadata);

            const projectRoot = join(sampleRoot, 'cap-project');
            const appRoot = join(projectRoot, 'apps/two');
            const appAccess = await createApplicationAccess(appRoot);
            const annotationFiles = await appAccess.readAnnotationFiles();
            expect(annotationFiles.map((annotationFile) => annotationFile.dataSourceUri)).toEqual([
                '/sap/opu/odata4/dmo/ODATA_SERVICE/'
            ]);
            expect(annotationFiles[0].fileContent.includes('Alias="Measures"')).toBeTruthy();
        });
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
        expect(await projectAccess.getApplicationIdByManifestAppId('two')).toBe(join('apps/two'));
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
