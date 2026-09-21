import { jest } from '@jest/globals';
import type * as uxI18nType from '@sap-ux/i18n';
import type * as capType from '../../../src/project/cap.js';
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

const realCap = await import('../../../src/project/cap.js');
jest.unstable_mockModule('../../../src/project/cap', () => ({
    ...realCap,
    getCapEnvironment: mockGetCapEnvironment,
    getCdsFiles: mockGetCdsFiles
}));

const { getCapI18nFolderNames, getI18nBundles } = await import('../../../src/project/i18n/index.js');

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
        test('bundles with sap.app fallback locale — merges fallback entries, primary wins on collision', async () => {
            const primaryData: uxI18nType.I18nBundle = { primaryKey: [], sharedKey: [] };
            const fallbackData: uxI18nType.I18nBundle = { fallbackKey: [], sharedKey: [] };
            const appPath = join('i18n', 'i18n.properties');
            const fallbackPath = join('i18n', 'i18n_en.properties');
            const root = 'root';
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce(primaryData) // sap.app primary
                .mockResolvedValueOnce(fallbackData); // sap.app fallback
            const result = await getI18nBundles(root, {
                'sap.app': appPath,
                'sap.app.fallbackLocale': fallbackPath,
                models: {}
            });
            // fallbackKey from fallback, sharedKey and primaryKey from primary
            expect(result['sap.app']).toEqual({ fallbackKey: [], sharedKey: [], primaryKey: [] });
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(1, appPath, undefined);
            expect(mockGetPropertiesI18nBundle).toHaveBeenNthCalledWith(2, fallbackPath, undefined);
        });

        test('bundles with sap.app fallback locale — fallback read failure is silently ignored', async () => {
            const primaryData: uxI18nType.I18nBundle = { primaryKey: [] };
            const appPath = join('i18n', 'i18n.properties');
            const fallbackPath = join('i18n', 'i18n_en.properties');
            const root = 'root';
            const enoentError = Object.assign(new Error('file not found'), { code: 'ENOENT' });
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce(primaryData) // sap.app primary
                .mockRejectedValueOnce(enoentError); // sap.app fallback missing
            const result = await getI18nBundles(root, {
                'sap.app': appPath,
                'sap.app.fallbackLocale': fallbackPath,
                models: {}
            });
            expect(result['sap.app']).toEqual(primaryData);
            expect(result.errors).toBeUndefined();
        });

        test('bundles with model fallback locale — merges fallback entries, primary wins on collision', async () => {
            const primaryData: uxI18nType.I18nBundle = { primaryKey: [], sharedKey: [] };
            const fallbackData: uxI18nType.I18nBundle = { fallbackKey: [], sharedKey: [] };
            const appPath = join('i18n', 'i18n.properties');
            const modelPath = join('i18n', 'i18n.properties');
            const modelFallbackPath = join('i18n', 'i18n_en.properties');
            const root = 'root';
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce({}) // sap.app
                .mockResolvedValueOnce(primaryData) // model primary
                .mockResolvedValueOnce(fallbackData); // model fallback
            const result = await getI18nBundles(root, {
                'sap.app': appPath,
                models: {
                    i18n: { path: modelPath, fallbackLocalePath: modelFallbackPath }
                }
            });
            expect(result.models['i18n']).toEqual({ fallbackKey: [], sharedKey: [], primaryKey: [] });
        });

        test('bundles with sap.app fallback locale — non-ENOENT fallback error is stored in errors', async () => {
            const primaryData: uxI18nType.I18nBundle = { primaryKey: [] };
            const appPath = join('i18n', 'i18n.properties');
            const fallbackPath = join('i18n', 'i18n_en.properties');
            const networkError = Object.assign(new Error('network failure'), { code: 'ENETDOWN' });
            mockGetPropertiesI18nBundle.mockResolvedValueOnce(primaryData).mockRejectedValueOnce(networkError);
            const result = await getI18nBundles('root', {
                'sap.app': appPath,
                'sap.app.fallbackLocale': fallbackPath,
                models: {}
            });
            expect(result['sap.app']).toEqual(primaryData);
            expect(result.errors?.['sap.app.fallbackLocale']).toBe(networkError);
        });

        test('bundles with model fallback locale — ENOENT fallback read failure is silently ignored', async () => {
            const primaryData: uxI18nType.I18nBundle = { primaryKey: [] };
            const modelPath = join('i18n', 'i18n.properties');
            const modelFallbackPath = join('i18n', 'i18n_en.properties');
            const enoentError = Object.assign(new Error('file not found'), { code: 'ENOENT' });
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce({}) // sap.app
                .mockResolvedValueOnce(primaryData) // model primary
                .mockRejectedValueOnce(enoentError); // model fallback missing
            const result = await getI18nBundles('root', {
                'sap.app': join('i18n', 'i18n.properties'),
                models: { i18n: { path: modelPath, fallbackLocalePath: modelFallbackPath } }
            });
            expect(result.models['i18n']).toEqual(primaryData);
            expect(result.errors).toBeUndefined();
        });

        test('bundles with model fallback locale — non-ENOENT fallback error is stored in errors', async () => {
            const modelPath = join('i18n', 'i18n.properties');
            const modelFallbackPath = join('i18n', 'i18n_en.properties');
            const networkError = Object.assign(new Error('network failure'), { code: 'ENETDOWN' });
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce({}) // sap.app
                .mockResolvedValueOnce({}) // model primary
                .mockRejectedValueOnce(networkError); // model fallback
            const result = await getI18nBundles('root', {
                'sap.app': join('i18n', 'i18n.properties'),
                models: { i18n: { path: modelPath, fallbackLocalePath: modelFallbackPath } }
            });
            expect(result.models['i18n']).toEqual({});
            expect(result.errors?.['models.i18n.fallbackLocale']).toBe(networkError);
        });

        test('bundles with sap.app fallback locale — ENOENT primary error is cleared when fallback succeeds', async () => {
            const fallbackData: uxI18nType.I18nBundle = { fallbackKey: [] };
            const appPath = join('i18n', 'i18n.properties');
            const fallbackPath = join('i18n', 'i18n_en.properties');
            const enoentError = Object.assign(new Error('file not found'), { code: 'ENOENT' });
            mockGetPropertiesI18nBundle
                .mockRejectedValueOnce(enoentError) // primary fails ENOENT
                .mockResolvedValueOnce(fallbackData); // fallback succeeds
            const result = await getI18nBundles('root', {
                'sap.app': appPath,
                'sap.app.fallbackLocale': fallbackPath,
                models: {}
            });
            expect(result['sap.app']).toEqual(fallbackData);
            expect(result.errors?.['sap.app']).toBeUndefined();
        });

        test('bundles with sap.app fallback locale — non-ENOENT primary error is preserved, fallback not attempted', async () => {
            const appPath = join('i18n', 'i18n.properties');
            const fallbackPath = join('i18n', 'i18n_en.properties');
            const permError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
            mockGetPropertiesI18nBundle.mockRejectedValueOnce(permError); // primary fails EACCES
            const result = await getI18nBundles('root', {
                'sap.app': appPath,
                'sap.app.fallbackLocale': fallbackPath,
                models: {}
            });
            expect(result['sap.app']).toEqual({});
            expect(result.errors?.['sap.app']).toBe(permError);
            expect(mockGetPropertiesI18nBundle).toHaveBeenCalledTimes(1);
        });

        test('bundles with model fallback locale — ENOENT primary error is cleared when fallback succeeds', async () => {
            const fallbackData: uxI18nType.I18nBundle = { fallbackKey: [] };
            const modelPath = join('i18n', 'i18n.properties');
            const modelFallbackPath = join('i18n', 'i18n_en.properties');
            const enoentError = Object.assign(new Error('file not found'), { code: 'ENOENT' });
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce({}) // sap.app
                .mockRejectedValueOnce(enoentError) // model primary fails ENOENT
                .mockResolvedValueOnce(fallbackData); // model fallback succeeds
            const result = await getI18nBundles('root', {
                'sap.app': join('i18n', 'i18n.properties'),
                models: { i18n: { path: modelPath, fallbackLocalePath: modelFallbackPath } }
            });
            expect(result.models['i18n']).toEqual(fallbackData);
            expect(result.errors?.['models.i18n']).toBeUndefined();
        });

        test('bundles with model fallback locale — non-ENOENT primary error is preserved, fallback not attempted', async () => {
            const modelPath = join('i18n', 'i18n.properties');
            const modelFallbackPath = join('i18n', 'i18n_en.properties');
            const permError = Object.assign(new Error('permission denied'), { code: 'EACCES' });
            mockGetPropertiesI18nBundle
                .mockResolvedValueOnce({}) // sap.app
                .mockRejectedValueOnce(permError); // model primary fails EACCES
            const result = await getI18nBundles('root', {
                'sap.app': join('i18n', 'i18n.properties'),
                models: { i18n: { path: modelPath, fallbackLocalePath: modelFallbackPath } }
            });
            expect(result.models['i18n']).toEqual({});
            expect(result.errors?.['models.i18n']).toBe(permError);
            expect(mockGetPropertiesI18nBundle).toHaveBeenCalledTimes(2); // sap.app + model primary only
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
