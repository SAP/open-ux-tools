import * as resolve from '../../../../src/utils';
import { createCapI18nEntry } from '../../../../src';
import * as json from '../../../../src/write/cap/json';
import * as properties from '../../../../src/write/cap/properties';
import * as csv from '../../../../src/write/cap/csv';

describe('createCapI18nEntry', () => {
    const env = Object.freeze({
        i18n: {
            folders: ['_i18n', 'i18n', 'assets/i18n'],
            default_language: 'en'
        }
    });
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
        const result = await createCapI18nEntry(
            'root',
            'path',
            [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ],
            env
        );
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenCalledTimes(1);
        expect(tryAddJsonTextsSpy).toHaveBeenCalledTimes(1);
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
        const result = await createCapI18nEntry(
            'root',
            'path',
            [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ],
            env
        );
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenCalledTimes(1);
        expect(tryAddJsonTextsSpy).toHaveBeenCalledTimes(1);
        expect(tryAddPropertiesTextsSpy).toHaveBeenCalledTimes(1);
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
    });
    test('existing csv file', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
        // act
        const result = await createCapI18nEntry(
            'root',
            'path',
            [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ],
            env
        );
        // assert
        expect(result).toBeTruthy();
        expect(getCapI18nFolder).toHaveBeenCalledTimes(1);
        expect(tryAddJsonTextsSpy).toHaveBeenCalledTimes(1);
        expect(tryAddPropertiesTextsSpy).toHaveBeenCalledTimes(1);
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(1);
    });
    test('none existing files', async () => {
        // arrange
        const getCapI18nFolder = jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        const tryAddJsonTextsSpy = jest.spyOn(json, 'tryAddJsonTexts').mockResolvedValue(false);
        const tryAddPropertiesTextsSpy = jest.spyOn(properties, 'tryAddPropertiesTexts').mockResolvedValue(false);
        const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
        // act
        const result = await createCapI18nEntry(
            'root',
            'path',
            [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ],
            env
        );
        // assert
        expect(result).toBeFalsy();
        expect(getCapI18nFolder).toHaveBeenCalledTimes(1);
        expect(tryAddJsonTextsSpy).toHaveBeenCalledTimes(1);
        expect(tryAddPropertiesTextsSpy).toHaveBeenCalledTimes(1);
        expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(1);
    });
    test('exception / error case', async () => {
        // arrange
        jest.spyOn(resolve, 'getCapI18nFolder').mockResolvedValue('path/to/i18n/folder');
        jest.spyOn(json, 'tryAddJsonTexts').mockImplementation(() => {
            throw new Error('should-throw-error');
        });
        // act
        const result = createCapI18nEntry(
            'root',
            'path',
            [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ],
            env
        );
        // assert
        return expect(result).rejects.toThrowError('should-throw-error');
    });
});
