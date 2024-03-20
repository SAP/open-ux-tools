import * as resolve from '../../../../src/utils';
import { createCapI18nEntries } from '../../../../src';
import * as json from '../../../../src/write/cap/json';
import * as properties from '../../../../src/write/cap/properties';
import * as csv from '../../../../src/write/cap/csv';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('createCapI18nEntries', () => {
    const env = Object.freeze({
        i18n: {
            folders: ['_i18n', 'i18n', 'assets/i18n'],
            default_language: 'en'
        }
    });
    const newEntries = [
        {
            key: 'NewKey',
            value: 'New Value'
        }
    ];
    afterEach(() => {
        jest.resetAllMocks();
    });
    const pathToFolder = join('path', 'to', 'i18n', 'folder');
    const pathToFolderI18n = join(pathToFolder, 'i18n');
    test('existing json file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue(pathToFolder);
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(true);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(true);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenCalledTimes(0);
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
    });
    test('existing properties file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue(pathToFolder);
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(true);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
    });
    test('existing csv file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue(pathToFolder);
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
    });
    test('existing csv file - mem-fs-editor', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue(pathToFolder);
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        const memFs = create(createStorage());
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env, memFs);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, memFs);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, memFs);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, memFs);
        expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, memFs);
    });
    test('none existing files', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue(pathToFolder);
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeFalsy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
    });
    test('exception / error case', async () => {
        // arrange
        jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue(pathToFolder);
        jest.spyOn(json, 'tryAddJsonTexts').mockImplementation(() => {
            throw new Error('should-throw-error');
        });
        // act
        const result = createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        return expect(result).rejects.toThrowError('should-throw-error');
    });
});
