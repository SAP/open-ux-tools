import * as resolve from '../../../../src/utils';
import { createCapI18nEntries } from '../../../../src';
import * as json from '../../../../src/write/cap/json';
import * as properties from '../../../../src/write/cap/properties';
import * as csv from '../../../../src/write/cap/csv';
import type { Editor } from 'mem-fs-editor';

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
    test('existing json file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(true);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(true);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenCalledTimes(0);
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
    });
    test('existing properties file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(true);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(
            1,
            env,
            'path/to/i18n/folder/i18n',
            newEntries,
            undefined
        );
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
    });
    test('existing csv file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(
            1,
            env,
            'path/to/i18n/folder/i18n',
            newEntries,
            undefined
        );
        expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, undefined);
    });
    test('existing csv file - mem-fs-editor', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        const fs = {} as unknown as Editor;
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env, fs);
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, fs);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, fs);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, fs);
        expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, fs);
    });
    test('none existing files', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeFalsy();
        expect(getCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(tryAddJsonTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, undefined);
        expect(tryAddPropertiesTextsSpy).toHaveBeenNthCalledWith(
            1,
            env,
            'path/to/i18n/folder/i18n',
            newEntries,
            undefined
        );
        expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, 'path/to/i18n/folder/i18n', newEntries, undefined);
    });
    test('exception / error case', async () => {
        // arrange
        jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        jest.spyOn(json, 'tryAddJsonTexts').mockImplementation(() => {
            throw new Error('should-throw-error');
        });
        // act
        const result = createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        return expect(result).rejects.toThrowError('should-throw-error');
    });
});
