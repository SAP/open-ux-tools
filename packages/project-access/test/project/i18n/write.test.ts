import { jest } from '@jest/globals';
import type * as uxI18nType from '@sap-ux/i18n';
import type * as capType from '../../../src/project/cap';
import type * as fileType from '../../../src/file';
import type * as fsPromisesType from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { I18nPropertiesPaths } from '../../../src';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const mockCreateCapI18nEntries = jest.fn<typeof uxI18nType.createCapI18nEntries>();
const mockCreatePropertiesI18nEntries = jest.fn<typeof uxI18nType.createPropertiesI18nEntries>();

const realUxI18n = await import('@sap-ux/i18n');
jest.unstable_mockModule('@sap-ux/i18n', () => ({
    ...realUxI18n,
    createCapI18nEntries: mockCreateCapI18nEntries,
    createPropertiesI18nEntries: mockCreatePropertiesI18nEntries
}));

const mockGetCapEnvironment = jest.fn<typeof capType.getCapEnvironment>();

const realCap = await import('../../../src/project/cap');
jest.unstable_mockModule('../../../src/project/cap', () => ({
    ...realCap,
    getCapEnvironment: mockGetCapEnvironment
}));

const mockReadJSON = jest.fn<typeof fileType.readJSON>();
const mockWriteFile = jest.fn<typeof fileType.writeFile>();

const realFile = await import('../../../src/file');
jest.unstable_mockModule('../../../src/file', () => ({
    ...realFile,
    readJSON: mockReadJSON,
    writeFile: mockWriteFile
}));

const mockMkdir = jest.fn<typeof fsPromisesType.mkdir>();

const realFsPromises = await import('node:fs/promises');
jest.unstable_mockModule('node:fs/promises', () => ({
    ...realFsPromises,
    mkdir: mockMkdir
}));

const { createAnnotationI18nEntries, createCapI18nEntries, createManifestI18nEntries, createUI5I18nEntries } =
    await import('../../../src/project/i18n');

describe('write', () => {
    const memFs = create(createStorage());
    beforeEach(() => {
        jest.restoreAllMocks();
        mockCreateCapI18nEntries.mockReset();
        mockCreatePropertiesI18nEntries.mockReset();
        mockGetCapEnvironment.mockReset();
        mockReadJSON.mockReset();
        mockWriteFile.mockReset();
        mockMkdir.mockReset();
    });
    const root = 'root';
    const manifestPath = join(root, 'app', 'path', 'manifestParent', 'manifest.json');
    const newI18nEntries: uxI18nType.NewI18nEntry[] = [
        {
            key: 'key',
            value: 'value'
        }
    ];
    describe('createCapI18nEntries', () => {
        test('without mem-fs-editor', async () => {
            const filePath = 'my-cds-file';
            mockCreateCapI18nEntries.mockResolvedValue(true);
            mockGetCapEnvironment.mockResolvedValue({});
            const result = await createCapI18nEntries(root, filePath, newI18nEntries);

            expect(result).toBeTruthy();

            expect(mockCreateCapI18nEntries).toHaveBeenNthCalledWith(1, root, filePath, newI18nEntries, {}, undefined);
            expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
        });
        test('with mem-fs-editor', async () => {
            const filePath = 'my-cds-file';
            mockCreateCapI18nEntries.mockResolvedValue(true);
            mockGetCapEnvironment.mockResolvedValue({});

            const result = await createCapI18nEntries(root, filePath, newI18nEntries, memFs);

            expect(result).toBeTruthy();
            expect(mockCreateCapI18nEntries).toHaveBeenNthCalledWith(1, root, filePath, newI18nEntries, {}, memFs);
            expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
        });
    });
    describe('createUI5I18nEntries', () => {
        test('i18n file exists', async () => {
            const absolutePathI18n = join('absolute', 'path', 'to', 'i18n.properties');
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {
                    i18n: {
                        path: absolutePathI18n
                    }
                }
            };
            mockMkdir.mockResolvedValue(undefined);
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createUI5I18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries, 'i18n');

            expect(result).toBeTruthy();
            expect(mockMkdir).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                undefined
            );
        });
        test('i18n file exists - mem-fs-editor', async () => {
            const absolutePathI18n = join('absolute', 'path', 'to', 'i18n.properties');
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {
                    i18n: {
                        path: absolutePathI18n
                    }
                }
            };
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createUI5I18nEntries(
                root,
                manifestPath,
                i18nPropertiesPaths,
                newI18nEntries,
                'i18n',
                memFs
            );

            expect(result).toBeTruthy();
            expect(mockMkdir).toHaveBeenCalledTimes(0);
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                memFs
            );
        });
        test('i18n file does not exist', async () => {
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {}
            };
            mockReadJSON.mockResolvedValue({});
            mockWriteFile.mockResolvedValue(undefined);
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createUI5I18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries, 'i18n');

            expect(result).toBeTruthy();
            expect(mockReadJSON).toHaveBeenNthCalledWith(1, manifestPath);
            const absolutePathI18n = join(dirname(manifestPath), 'i18n/i18n.properties');
            const manifest = {
                'sap.ui5': {
                    models: {
                        i18n: {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/i18n.properties'
                        }
                    }
                }
            };
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                manifestPath,
                JSON.stringify(manifest, undefined, 4),
                undefined
            );
            expect(mockMkdir).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                undefined
            );
        });
        test('i18n file does not exist - mem-fs-editor', async () => {
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {}
            };
            mockReadJSON.mockResolvedValue({});
            mockWriteFile.mockResolvedValue(undefined);
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createUI5I18nEntries(
                root,
                manifestPath,
                i18nPropertiesPaths,
                newI18nEntries,
                'i18n',
                memFs
            );

            expect(result).toBeTruthy();
            expect(mockReadJSON).toHaveBeenNthCalledWith(1, manifestPath);
            const absolutePathI18n = join(dirname(manifestPath), 'i18n/i18n.properties');
            const manifest = {
                'sap.ui5': {
                    models: {
                        i18n: {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/i18n.properties'
                        }
                    }
                }
            };
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                manifestPath,
                JSON.stringify(manifest, undefined, 4),
                memFs
            );
            expect(mockMkdir).toHaveBeenCalledTimes(0);
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                memFs
            );
        });
    });
    describe('createAnnotationI18nEntries', () => {
        test('i18n file exists', async () => {
            const absolutePathI18n = join('absolute', 'path', 'to', 'at', 'i18n.properties');
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {
                    '@i18n': {
                        path: absolutePathI18n
                    }
                }
            };
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);
            const result = await createAnnotationI18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries);
            expect(result).toBeTruthy();
            expect(mockMkdir).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                undefined
            );
        });
        test('i18n file exists - mem-fs-editor', async () => {
            const absolutePathI18n = join('absolute', 'path', 'to', 'at', 'i18n.properties');
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {
                    '@i18n': {
                        path: absolutePathI18n
                    }
                }
            };
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createAnnotationI18nEntries(
                root,
                manifestPath,
                i18nPropertiesPaths,
                newI18nEntries,
                memFs
            );

            expect(result).toBeTruthy();
            expect(mockMkdir).toHaveBeenCalledTimes(0);
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                memFs
            );
        });
        test('i18n file does not exist', async () => {
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {}
            };
            mockReadJSON.mockResolvedValue({});
            mockWriteFile.mockResolvedValue(undefined);
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);
            const result = await createAnnotationI18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries);
            expect(result).toBeTruthy();
            expect(mockReadJSON).toHaveBeenNthCalledWith(1, manifestPath);
            const absolutePathI18n = join(dirname(manifestPath), 'i18n/i18n.properties');
            const manifest = {
                'sap.ui5': {
                    models: {
                        '@i18n': {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/i18n.properties'
                        }
                    }
                }
            };
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                manifestPath,
                JSON.stringify(manifest, undefined, 4),
                undefined
            );
            expect(mockMkdir).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                undefined
            );
        });
        test('i18n file does not exist -  mem-fs-editor', async () => {
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {}
            };
            mockReadJSON.mockResolvedValue({});
            mockWriteFile.mockResolvedValue(undefined);
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createAnnotationI18nEntries(
                root,
                manifestPath,
                i18nPropertiesPaths,
                newI18nEntries,
                memFs
            );

            expect(result).toBeTruthy();
            expect(mockReadJSON).toHaveBeenNthCalledWith(1, manifestPath);
            const absolutePathI18n = join(dirname(manifestPath), 'i18n/i18n.properties');
            const manifest = {
                'sap.ui5': {
                    models: {
                        '@i18n': {
                            type: 'sap.ui.model.resource.ResourceModel',
                            uri: 'i18n/i18n.properties'
                        }
                    }
                }
            };
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                manifestPath,
                JSON.stringify(manifest, undefined, 4),
                memFs
            );
            expect(mockMkdir).toHaveBeenCalledTimes(0);
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                memFs
            );
        });
    });
    describe('createManifestI18nEntries', () => {
        test('without mem-fs-editor', async () => {
            const absolutePathI18n = join('absolute', 'path', 'to', 'at', 'i18n.properties');
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': absolutePathI18n,
                models: {}
            };
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createManifestI18nEntries(root, i18nPropertiesPaths, newI18nEntries);

            expect(result).toBeTruthy();
            expect(mockMkdir).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                undefined
            );
        });
        test('with mem-fs-editor', async () => {
            const absolutePathI18n = join('absolute', 'path', 'to', 'at', 'i18n.properties');
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': absolutePathI18n,
                models: {}
            };
            mockCreatePropertiesI18nEntries.mockResolvedValue(true);

            const result = await createManifestI18nEntries(root, i18nPropertiesPaths, newI18nEntries, memFs);

            expect(result).toBeTruthy();
            expect(mockMkdir).toHaveBeenCalledTimes(0);
            expect(mockCreatePropertiesI18nEntries).toHaveBeenNthCalledWith(
                1,
                absolutePathI18n,
                newI18nEntries,
                root,
                memFs
            );
        });
    });
});
