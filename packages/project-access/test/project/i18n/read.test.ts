import { jest } from '@jest/globals';
import type * as uxI18nType from '@sap-ux/i18n';
import type * as capType from '../../../src/project/cap';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const mockGetPropertiesI18nBundle = jest.fn<typeof uxI18nType.getPropertiesI18nBundle>();
const mockGetCapI18nBundle = jest.fn<typeof uxI18nType.getCapI18nBundle>();
const mockGetI18nFolderNames = jest.fn<typeof uxI18nType.getI18nFolderNames>();

const realUxI18n = await import('@sap-ux/i18n');
jest.unstable_mockModule('@sap-ux/i18n', () => ({
    ...realUxI18n,
    getPropertiesI18nBundle: mockGetPropertiesI18nBundle,
    getCapI18nBundle: mockGetCapI18nBundle,
    getI18nFolderNames: mockGetI18nFolderNames
}));

const mockGetCapEnvironment = jest.fn<typeof capType.getCapEnvironment>();
const mockGetCdsFiles = jest.fn<typeof capType.getCdsFiles>();

const realCap = await import('../../../src/project/cap');
jest.unstable_mockModule('../../../src/project/cap', () => ({
    ...realCap,
    getCapEnvironment: mockGetCapEnvironment,
    getCdsFiles: mockGetCdsFiles
}));

const { getCapI18nFolderNames, getI18nBundles } = await import('../../../src/project/i18n');

describe('read', () => {
    const memFs = create(createStorage());
    beforeEach(() => {
        jest.restoreAllMocks();
        mockGetPropertiesI18nBundle.mockReset();
        mockGetCapI18nBundle.mockReset();
        mockGetI18nFolderNames.mockReset();
        mockGetCapEnvironment.mockReset();
        mockGetCdsFiles.mockReset();
    });

    describe('getI18nBundles()', () => {
        test('bundles for CAPNodejs', async () => {
            const data: uxI18nType.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const root = 'root';
            mockGetPropertiesI18nBundle.mockResolvedValue(data);
            mockGetCapEnvironment.mockResolvedValue({});
            mockGetCdsFiles.mockResolvedValue([]);
            mockGetCapI18nBundle.mockResolvedValue(data);
            const result = await getI18nBundles(
                root,
                {
                    'sap.app': absolutePath,
                    models: {}
                },
                'CAPNodejs'
            );
            expect(result).toEqual({ 'sap.app': data, models: {}, service: data });
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, undefined);
            expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
            expect(mockGetCdsFiles).toHaveBeenNthCalledWith(1, root, true);
            expect(mockGetCapI18nBundle).toHaveBeenNthCalledWith(1, root, {}, [], undefined);
        });
        test('bundles for CAPJava', async () => {
            const data: uxI18nType.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const root = 'root';
            mockGetPropertiesI18nBundle.mockResolvedValue(data);
            mockGetCapEnvironment.mockResolvedValue({});
            mockGetCdsFiles.mockResolvedValue([]);
            mockGetCapI18nBundle.mockResolvedValue(data);
            const result = await getI18nBundles(
                root,
                {
                    'sap.app': absolutePath,
                    models: {}
                },
                'CAPJava'
            );
            expect(result).toEqual({ 'sap.app': data, models: {}, service: data });
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, undefined);
            expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
            expect(mockGetCdsFiles).toHaveBeenNthCalledWith(1, root, true);
            expect(mockGetCapI18nBundle).toHaveBeenNthCalledWith(1, root, {}, [], undefined);
        });
        test('bundles for CAPNodejs - mem-fs-editor', async () => {
            const data: uxI18nType.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const root = 'root';
            mockGetPropertiesI18nBundle.mockResolvedValue(data);
            mockGetCapEnvironment.mockResolvedValue({});
            mockGetCdsFiles.mockResolvedValue([]);
            mockGetCapI18nBundle.mockResolvedValue(data);
            const result = await getI18nBundles(
                root,
                {
                    'sap.app': absolutePath,
                    models: {}
                },
                'CAPNodejs',
                memFs
            );
            expect(result).toEqual({ 'sap.app': data, models: {}, service: data });
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, memFs);
            expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
            expect(mockGetCdsFiles).toHaveBeenNthCalledWith(1, root, true);
            expect(mockGetCapI18nBundle).toHaveBeenNthCalledWith(1, root, {}, [], memFs);
        });
        test('bundles with models', async () => {
            const data: uxI18nType.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'properties', 'file');
            const absolutePathI18n = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const absolutePathAtI18n = join('absolute', 'path', 'to', '@i18n', 'properties', 'file');
            const root = 'root';
            mockGetPropertiesI18nBundle.mockResolvedValue(data);
            const result = await getI18nBundles(root, {
                'sap.app': absolutePath,
                models: {
                    'i18n': { path: absolutePathI18n },
                    '@i18n': { path: absolutePathAtI18n }
                }
            });
            expect(result).toEqual({ 'sap.app': data, models: { i18n: data, '@i18n': data }, service: {} });
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, undefined);
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(2, absolutePathI18n, undefined);
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(3, absolutePathAtI18n, undefined);
        });
        test('bundles with models - mem-fs-editor', async () => {
            const data: uxI18nType.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'properties', 'file');
            const absolutePathI18n = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const absolutePathAtI18n = join('absolute', 'path', 'to', '@i18n', 'properties', 'file');
            const root = 'root';
            mockGetPropertiesI18nBundle.mockResolvedValue(data);
            const result = await getI18nBundles(
                root,
                {
                    'sap.app': absolutePath,
                    models: {
                        'i18n': { path: absolutePathI18n },
                        '@i18n': { path: absolutePathAtI18n }
                    }
                },
                undefined,
                memFs
            );
            expect(result).toEqual({ 'sap.app': data, models: { i18n: data, '@i18n': data }, service: {} });
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, memFs);
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(2, absolutePathI18n, memFs);
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(3, absolutePathAtI18n, memFs);
        });
        describe('exception', () => {
            test('bundles for CAPNodejs', async () => {
                const data: uxI18nType.I18nBundle = {
                    'key': []
                };
                const absolutePath = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
                const root = 'root';
                mockGetPropertiesI18nBundle.mockResolvedValue(data);
                mockGetCapEnvironment.mockResolvedValue({});
                mockGetCdsFiles.mockResolvedValue([]);
                mockGetCapI18nBundle.mockRejectedValue('error-raised');
                const result = await getI18nBundles(
                    root,
                    {
                        'sap.app': absolutePath,
                        models: {}
                    },
                    'CAPNodejs'
                );
                expect(result).toEqual({
                    'sap.app': data,
                    models: {},
                    service: {},
                    errors: { service: 'error-raised' }
                });
                expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, undefined);
                expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
                expect(mockGetCdsFiles).toHaveBeenNthCalledWith(1, root, true);
                expect(mockGetCapI18nBundle).toHaveBeenNthCalledWith(1, root, {}, [], undefined);
            });
            test('bundles with models', async () => {
                const data: uxI18nType.I18nBundle = {
                    'key': []
                };
                const absolutePath = join('absolute', 'path', 'to', 'properties', 'file');
                const absolutePathI18n = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
                const absolutePathAtI18n = join('absolute', 'path', 'to', '@i18n', 'properties', 'file');
                const root = 'root';
                mockGetPropertiesI18nBundle
                    .mockRejectedValueOnce('error-raised-app')
                    .mockRejectedValueOnce('error-raised-model-i18n')
                    .mockResolvedValue(data);
                const result = await getI18nBundles(root, {
                    'sap.app': absolutePath,
                    models: {
                        i18n: { path: absolutePathI18n },
                        '@i18n': { path: absolutePathAtI18n }
                    }
                });
                expect(result).toEqual({
                    'sap.app': {},
                    models: { i18n: {}, '@i18n': data },
                    service: {},
                    errors: {
                        'sap.app': 'error-raised-app',
                        'models.i18n': 'error-raised-model-i18n'
                    }
                });
                expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, absolutePath, undefined);
                expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(2, absolutePathI18n, undefined);
                expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(3, absolutePathAtI18n, undefined);
            });
        });
    });
    test('getCapI18nFolderNames()', async () => {
        const data = ['i18n', '_i18n'];
        mockGetCapEnvironment.mockResolvedValue({});
        mockGetI18nFolderNames.mockResolvedValue(data as never);
        const root = 'root';
        const result = await getCapI18nFolderNames(root);
        expect(result).toEqual(data);
        expect(mockGetCapEnvironment).toHaveBeenNthCalledWith(1, root);
        expect(mockGetI18nFolderNames).toHaveBeenNthCalledWith(1, {});
    });
});
