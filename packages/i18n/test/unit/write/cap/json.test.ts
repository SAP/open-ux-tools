import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

// Mock functions
const mockDoesExist = jest.fn<(...args: unknown[]) => Promise<boolean>>();
const mockReadFile = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockWriteFile = jest.fn<(...args: unknown[]) => Promise<string | void>>();

// Mock the utils module with async factory
jest.unstable_mockModule('../../../../src/utils', async () => {
    const config = await import('../../../../src/utils/config');
    const resolve = await import('../../../../src/utils/resolve');
    const path = await import('../../../../src/utils/path');
    const print = await import('../../../../src/utils/print');
    const text = await import('../../../../src/utils/text');
    const key = await import('../../../../src/utils/key');
    return {
        ...config,
        ...resolve,
        ...path,
        ...print,
        ...text,
        ...key,
        doesExist: mockDoesExist,
        readFile: mockReadFile,
        writeFile: mockWriteFile
    };
});

// Import after mocking
const { addJsonTexts, tryAddJsonTexts } = await import('../../../../src/write/cap/json');

describe('json', () => {
    describe('add new i18n entries to json file', () => {
        test('empty file', () => {
            const result = addJsonTexts('', 'fallback', [{ key: 'key', value: 'value' }]);
            expect(result).toMatchSnapshot();
        });
        test('empty bundle', () => {
            const result = addJsonTexts('{}', 'fallback', [{ key: 'key', value: 'value' }]);
            expect(result).toMatchSnapshot();
        });
        test('existing bundle', () => {
            const content = `
            {
                "" : {}
            }`;
            const result = addJsonTexts(content, 'fallback', [{ key: 'key', value: 'value' }]);
            expect(result).toMatchSnapshot();
        });
        test('empty fallback bundle', () => {
            const content = `
            {
                "fallback" : {}
            }`;
            const result = addJsonTexts(content, 'fallback', [{ key: 'key', value: 'value' }]);
            expect(result).toMatchSnapshot();
        });
        test('empty fallback bundle with multi-line', () => {
            const content = `
            {
                "fallback" : {

                }
            }`;
            const result = addJsonTexts(content, 'fallback', [{ key: 'key', value: 'value' }]);
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
                { key: 'key', value: 'value' },
                { key: 'key2', value: 'value2' }
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
        const entries = [{ key: 'NewKey', value: 'New Value' }];
        afterEach(() => {
            jest.resetAllMocks();
        });
        test('json file does not exist', async () => {
            mockDoesExist.mockResolvedValue(false);
            mockReadFile.mockResolvedValue('');
            mockWriteFile.mockResolvedValue(undefined);
            const result = await tryAddJsonTexts(env, path, entries);
            expect(result).toEqual(false);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, i18nPath);
            expect(mockReadFile).toHaveBeenCalledTimes(0);
            expect(mockWriteFile).toHaveBeenCalledTimes(0);
        });
        test('add to existing .json file', async () => {
            mockDoesExist.mockResolvedValue(true);
            mockReadFile.mockResolvedValue('');
            mockWriteFile.mockResolvedValue(undefined);
            const result = await tryAddJsonTexts(env, path, entries);
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, i18nPath);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, i18nPath, undefined);
            const addedContent = `{
    "": {
        "NewKey": "New Value"
    }
}`;
            expect(mockWriteFile).toHaveBeenNthCalledWith(1, i18nPath, addedContent, undefined);
        });
        test('add to existing .json file - mem-fs-editor', async () => {
            mockDoesExist.mockResolvedValue(true);
            mockReadFile.mockResolvedValue('');
            mockWriteFile.mockResolvedValue('');
            const memFs = create(createStorage());
            const result = await tryAddJsonTexts(env, path, entries, memFs);
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, i18nPath);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, i18nPath, memFs);
            const addedContent = `{
    "": {
        "NewKey": "New Value"
    }
}`;
            expect(mockWriteFile).toHaveBeenNthCalledWith(1, i18nPath, addedContent, memFs);
        });
    });
});
