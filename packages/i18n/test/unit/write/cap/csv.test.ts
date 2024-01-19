import { addCsvTexts, tryAddCsvTexts } from '../../../../src/write/cap/csv';
import * as utils from '../../../../src/utils';
import fs from 'fs';
import { join } from 'path';

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
        test('csv file does not exist', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddCsvTexts(env, path, [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ]);
            // assert
            expect(result).toEqual(false);
            expect(doesExistSpy).toHaveBeenCalledTimes(1);
            expect(readFileSpy).toHaveBeenCalledTimes(0);
            expect(writeFileSpy).toHaveBeenCalledTimes(0);
        });
        test('add to existing .csv file', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddCsvTexts(env, path, [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ]);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenCalledTimes(1);
            expect(readFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                join('root', '_i18n', 'i18n.csv'),
                'key;en\nNewKey;New Value\n',
                {
                    encoding: 'utf8'
                }
            );
        });
    });
});
