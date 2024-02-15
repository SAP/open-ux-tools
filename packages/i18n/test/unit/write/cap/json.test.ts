import { addJsonTexts, tryAddJsonTexts } from '../../../../src/write/cap/json';
import * as utils from '../../../../src/utils';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

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
        const i18nPath = join('root', '_i18n', 'i18n.json');
        const env = Object.freeze({
            i18n: {
                folders: ['_i18n', 'i18n', 'assets/i18n'],
                default_language: 'en'
            }
        });
        const entries = [
            {
                key: 'NewKey',
                value: 'New Value'
            }
        ];
        afterEach(() => {
            jest.resetAllMocks();
        });
        test('json file does not exist', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddJsonTexts(env, path, entries);
            // assert
            expect(result).toEqual(false);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, i18nPath);
            expect(readFileSpy).toHaveBeenCalledTimes(0);
            expect(writeFileSpy).toHaveBeenCalledTimes(0);
        });
        test('add to existing .json file', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await tryAddJsonTexts(env, path, entries);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, i18nPath);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, i18nPath, undefined);
            const addedContent = `{
    "": {
        "NewKey": "New Value"
    }
}`;
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, i18nPath, addedContent, undefined);
        });
        test('add to existing .json file - mem-fs-editor', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue('');
            const memFs = create(createStorage());
            // act
            const result = await tryAddJsonTexts(env, path, entries, memFs);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, i18nPath);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, i18nPath, memFs);
            const addedContent = `{
    "": {
        "NewKey": "New Value"
    }
}`;
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, i18nPath, addedContent, memFs);
        });
    });
});
