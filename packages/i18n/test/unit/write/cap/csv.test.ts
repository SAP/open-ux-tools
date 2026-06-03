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
const { addCsvTexts, tryAddCsvTexts } = await import('../../../../src/write/cap/csv');

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
            mockDoesExist.mockResolvedValue(false);
            mockReadFile.mockResolvedValue('');
            mockWriteFile.mockResolvedValue(undefined);
            // act
            const result = await tryAddCsvTexts(env, path, entries);
            // assert
            expect(result).toEqual(false);
            expect(mockDoesExist).toHaveBeenCalledTimes(1);
            expect(mockReadFile).toHaveBeenCalledTimes(0);
            expect(mockWriteFile).toHaveBeenCalledTimes(0);
        });
        test('add to existing .csv file', async () => {
            // arrange
            const csvI18nFilePath = join('root', '_i18n', 'i18n.csv');
            mockDoesExist.mockResolvedValue(true);
            mockReadFile.mockResolvedValue('');
            mockWriteFile.mockResolvedValue(undefined);
            // act
            const result = await tryAddCsvTexts(env, path, entries);
            // assert
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, csvI18nFilePath);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, csvI18nFilePath, undefined);
            expect(mockWriteFile).toHaveBeenNthCalledWith(1, csvI18nFilePath, 'key;en\nNewKey;New Value\n', undefined);
        });
        test('add to existing .csv file - mem-fs-editor', async () => {
            // arrange
            const memFs = create(createStorage());
            const csvI18nFilePath = join('root', '_i18n', 'i18n.csv');
            mockDoesExist.mockResolvedValue(true);
            mockReadFile.mockResolvedValue('');
            mockWriteFile.mockResolvedValue(undefined);
            // act
            const result = await tryAddCsvTexts(env, path, entries, memFs);
            // assert
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, csvI18nFilePath);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, csvI18nFilePath, memFs);
            expect(mockWriteFile).toHaveBeenNthCalledWith(1, csvI18nFilePath, 'key;en\nNewKey;New Value\n', memFs);
        });
    });
});
