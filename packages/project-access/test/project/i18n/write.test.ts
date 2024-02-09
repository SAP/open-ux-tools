import * as uxI18n from '@sap-ux/i18n';
import * as cap from '../../../src/project/cap';
import * as file from '../../../src/file';
import {
    createAnnotationI18nEntries,
    createCapI18nEntries,
    createManifestI18nEntries,
    createUI5I18nEntries
} from '../../../src/project/i18n';
import { dirname, join } from 'path';
import type { I18nPropertiesPaths } from '../../../src';
import * as fs from 'fs';
describe('write', () => {
    beforeEach(() => jest.restoreAllMocks());
    const root = 'root';
    const manifestPath = join('absolute', 'path', 'to', 'manifest', 'file');
    const newI18nEntries: uxI18n.NewI18nEntry[] = [
        {
            key: 'key',
            value: 'value'
        }
    ];
    test('createCapI18nEntries', async () => {
        const filePath = 'my-cds-file';
        const createCapI18nEntriesSpy = jest.spyOn(uxI18n, 'createCapI18nEntries').mockResolvedValue(true);
        const getCapEnvironmentSoy = jest.spyOn(cap, 'getCapEnvironment').mockResolvedValue({});
        const result = await createCapI18nEntries(root, filePath, newI18nEntries);
        expect(result).toBeTruthy();
        expect(createCapI18nEntriesSpy).toHaveBeenNthCalledWith(1, root, filePath, newI18nEntries, {});
        expect(getCapEnvironmentSoy).toHaveBeenNthCalledWith(1, root);
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
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const createPropertiesI18nEntriesSpy = jest
                .spyOn(uxI18n, 'createPropertiesI18nEntries')
                .mockResolvedValue(true);
            const result = await createUI5I18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries, 'i18n');
            expect(result).toBeTruthy();
            expect(mkdirSpy).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(createPropertiesI18nEntriesSpy).toHaveBeenNthCalledWith(1, absolutePathI18n, newI18nEntries, root);
        });
        test('i18n file does not exist', async () => {
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {}
            };
            const readJSONSpy = jest.spyOn(file, 'readJSON').mockResolvedValue({});
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const createPropertiesI18nEntriesSpy = jest
                .spyOn(uxI18n, 'createPropertiesI18nEntries')
                .mockResolvedValue(true);
            const result = await createUI5I18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries, 'i18n');
            expect(result).toBeTruthy();
            expect(readJSONSpy).toHaveBeenNthCalledWith(1, manifestPath);
            const absolutePathI18n = join(root, 'i18n/i18n.properties');
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
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, manifestPath, JSON.stringify(manifest, undefined, 4), {
                encoding: 'utf8'
            });
            expect(mkdirSpy).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(createPropertiesI18nEntriesSpy).toHaveBeenNthCalledWith(1, absolutePathI18n, newI18nEntries, root);
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
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const createPropertiesI18nEntriesSpy = jest
                .spyOn(uxI18n, 'createPropertiesI18nEntries')
                .mockResolvedValue(true);
            const result = await createAnnotationI18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries);
            expect(result).toBeTruthy();
            expect(mkdirSpy).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(createPropertiesI18nEntriesSpy).toHaveBeenNthCalledWith(1, absolutePathI18n, newI18nEntries, root);
        });
        test('i18n file does not exist', async () => {
            const i18nPropertiesPaths: I18nPropertiesPaths = {
                'sap.app': 'absolute-path',
                models: {}
            };
            const readJSONSpy = jest.spyOn(file, 'readJSON').mockResolvedValue({});
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
            const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
            const createPropertiesI18nEntriesSpy = jest
                .spyOn(uxI18n, 'createPropertiesI18nEntries')
                .mockResolvedValue(true);
            const result = await createAnnotationI18nEntries(root, manifestPath, i18nPropertiesPaths, newI18nEntries);
            expect(result).toBeTruthy();
            expect(readJSONSpy).toHaveBeenNthCalledWith(1, manifestPath);
            const absolutePathI18n = join(root, 'i18n/i18n.properties');
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
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, manifestPath, JSON.stringify(manifest, undefined, 4), {
                encoding: 'utf8'
            });
            expect(mkdirSpy).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
            expect(createPropertiesI18nEntriesSpy).toHaveBeenNthCalledWith(1, absolutePathI18n, newI18nEntries, root);
        });
    });
    test('createManifestI18nEntries', async () => {
        const absolutePathI18n = join('absolute', 'path', 'to', 'at', 'i18n.properties');
        const i18nPropertiesPaths: I18nPropertiesPaths = {
            'sap.app': absolutePathI18n,
            models: {}
        };
        const mkdirSpy = jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
        const createPropertiesI18nEntriesSpy = jest
            .spyOn(uxI18n, 'createPropertiesI18nEntries')
            .mockResolvedValue(true);
        const result = await createManifestI18nEntries(root, i18nPropertiesPaths, newI18nEntries);
        expect(result).toBeTruthy();
        expect(mkdirSpy).toHaveBeenNthCalledWith(1, dirname(absolutePathI18n), { recursive: true });
        expect(createPropertiesI18nEntriesSpy).toHaveBeenNthCalledWith(1, absolutePathI18n, newI18nEntries, root);
    });
});
