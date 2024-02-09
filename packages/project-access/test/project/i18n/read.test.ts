import * as uxI18n from '@sap-ux/i18n';
import * as cap from '../../../src/project/cap';
import { getCapI18nFolderNames, getI18nBundles } from '../../../src/project/i18n';
import { join } from 'path';

describe('read', () => {
    beforeEach(() => jest.restoreAllMocks());

    describe('getI18nBundles()', () => {
        test('bundles for CAPNodejs', async () => {
            const data: uxI18n.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const root = 'root';
            const getPropertiesI18nBundleSpy = jest.spyOn(uxI18n, 'getPropertiesI18nBundle').mockResolvedValue(data);
            const getCapEnvironmentSoy = jest.spyOn(cap, 'getCapEnvironment').mockResolvedValue({});
            const getCdsFilesSpy = jest.spyOn(cap, 'getCdsFiles').mockResolvedValue([]);
            const getCapI18nBundleSpy = jest.spyOn(uxI18n, 'getCapI18nBundle').mockResolvedValue(data);
            const result = await getI18nBundles(
                root,
                {
                    'sap.app': absolutePath,
                    models: {}
                },
                'CAPNodejs'
            );
            expect(result).toEqual({ 'sap.app': data, models: {}, service: data });
            expect(getPropertiesI18nBundleSpy).toHaveBeenNthCalledWith(1, absolutePath);
            expect(getCapEnvironmentSoy).toHaveBeenNthCalledWith(1, root);
            expect(getCdsFilesSpy).toHaveBeenNthCalledWith(1, root, true);
            expect(getCapI18nBundleSpy).toHaveBeenNthCalledWith(1, root, {}, []);
        });
        test('bundles with models', async () => {
            const data: uxI18n.I18nBundle = {
                'key': []
            };
            const absolutePath = join('absolute', 'path', 'to', 'properties', 'file');
            const absolutePathI18n = join('absolute', 'path', 'to', 'i18n', 'properties', 'file');
            const absolutePathAtI18n = join('absolute', 'path', 'to', '@i18n', 'properties', 'file');
            const root = 'root';
            const getPropertiesI18nBundleSpy = jest.spyOn(uxI18n, 'getPropertiesI18nBundle').mockResolvedValue(data);
            const result = await getI18nBundles(root, {
                'sap.app': absolutePath,
                models: {
                    'i18n': { path: absolutePathI18n },
                    '@i18n': { path: absolutePathAtI18n }
                }
            });
            expect(result).toEqual({ 'sap.app': data, models: { i18n: data, '@i18n': data }, service: {} });
            expect(getPropertiesI18nBundleSpy).toHaveBeenNthCalledWith(1, absolutePath);
            expect(getPropertiesI18nBundleSpy).toHaveBeenNthCalledWith(2, absolutePathI18n);
            expect(getPropertiesI18nBundleSpy).toHaveBeenNthCalledWith(3, absolutePathAtI18n);
        });
    });
    test('getCapI18nFolderNames()', async () => {
        const data = ['i18n', '_i18n'];
        const getCapEnvironmentSoy = jest.spyOn(cap, 'getCapEnvironment').mockResolvedValue({});
        const getI18nFolderNamesSpy = jest.spyOn(uxI18n, 'getI18nFolderNames').mockResolvedValue(data as never);
        const root = 'root';
        const result = await getCapI18nFolderNames(root);
        expect(result).toEqual(data);
        expect(getCapEnvironmentSoy).toHaveBeenNthCalledWith(1, root);
        expect(getI18nFolderNamesSpy).toHaveBeenNthCalledWith(1, {});
    });
});
