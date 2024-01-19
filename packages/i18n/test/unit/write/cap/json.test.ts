import { addJsonTexts, tryAddJsonTexts } from '../../../../src/write/cap/json';
import * as utils from '../../../../src/utils';
import fs from 'fs';
import { join } from 'path';

describe('json', () => {
    describe('add new i18n entries to json file', () => {
        test('empty file', () => {
            const result = addJsonTexts('', 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('empty bundle', () => {
            const result = addJsonTexts('{}', 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('existing bundle', () => {
            const content = `
            {
                "" : {}
            }`;
            const result = addJsonTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('empty fallback bundle', () => {
            const content = `
            {
                "fallback" : {}
            }`;
            const result = addJsonTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('empty fallback bundle with multi-line', () => {
            const content = `
            {
                "fallback" : {

                }
            }`;
            const result = addJsonTexts(content, 'fallback', [
                {
                    key: 'key',
                    value: 'value'
                }
            ]);
            expect(result).toMatchSnapshot();
        });
        test('fallback bundle with values', () => {
            const content = `
            {
                "fallback" : {
                    "a": "b"
                }
            }`;
            const result = addJsonTexts(content, 'fallback', [
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
    describe('tryAddJsonTexts', () => {
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
        test('json file does not exist', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddJsonTexts(env, path, [
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
        test('add to existing .json file', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddJsonTexts(env, path, [
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
            const addedContent = `{
    "": {
        "NewKey": "New Value"
    }
}`;
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, join('root', '_i18n', 'i18n.json'), addedContent, {
                encoding: 'utf8'
            });
        });
    });
});
