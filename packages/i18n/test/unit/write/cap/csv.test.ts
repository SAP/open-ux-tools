import { addCsvTexts, tryAddCsvTexts } from '../../../../src/write/cap/csv';
import * as utils from '../../../../src/utils';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('csv', () => {
    describe('add new i18n entries to csv file', () => {
        test('empty file', () => {
            const result = addCsvTexts('', 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('empty bundle', () => {
            const result = addCsvTexts('key', 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('empty fallback bundle', () => {
            const content = `key;fallback\n`;
            const result = addCsvTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('fallback bundle with multiple values', () => {
            const content = `key;fallback\n`;
            const result = addCsvTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                },
                {
                    key: 'key2',
                    value: 'value2'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('multiple bundles with values', () => {
            const content = `key;en;de;fallback\nkey;e;d;\n`;
            const result = addCsvTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                },
                {
                    key: 'key2',
                    value: 'value2'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('multiple bundles with values, but no fallback bundle', () => {
            const content = `key;en;de\nkey;e;d\n`;
            const result = addCsvTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                },
                {
                    key: 'key2',
                    value: 'value2'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
    });
    describe('tryAddCsvTexts', () => {
        const path = join('root', '_i18n', 'i18n');
        const env = Object.freeze({
            i18n: {
                folders: ['_i18n', 'i18n', 'assets/i18n'],
                default_language: 'en'
            }
        });
        afterEach(() => {
            jest.resetAllMocks();
        });
        const entries = [
            {
                key: 'NewKey',
                value: 'New Value'
            }
        ];
        test('csv file does not exist', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddCsvTexts(env, path, entries);
            // assert
            expect(result).toEqual(false);
            expect(doesExistSpy).toHaveBeenCalledTimes(1);
            expect(readFileSpy).toHaveBeenCalledTimes(0);
            expect(writeFileSpy).toHaveBeenCalledTimes(0);
        });
        test('add to existing .csv file', async () => {
            // arrange
            const csvI18nFilePath = join('root', '_i18n', 'i18n.csv');
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddCsvTexts(env, path, entries);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, csvI18nFilePath);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, csvI18nFilePath, undefined);
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, csvI18nFilePath, 'key;en\nNewKey;New Value\n', undefined);
        });
        test('add to existing .csv file - mem-fs-editor', async () => {
            // arrange
            const memFs = create(createStorage());
            const csvI18nFilePath = join('root', '_i18n', 'i18n.csv');
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddCsvTexts(env, path, entries, memFs);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, csvI18nFilePath);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, csvI18nFilePath, memFs);
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, csvI18nFilePath, 'key;en\nNewKey;New Value\n', memFs);
        });
    });
});
