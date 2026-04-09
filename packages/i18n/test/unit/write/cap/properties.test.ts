import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

// Define mock functions
const mockDoesExist = jest.fn<(...args: unknown[]) => Promise<boolean>>();
const mockReadFile = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockWriteFile = jest.fn<(...args: unknown[]) => Promise<string | void>>();

// Mock utils module
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

// Mock csv module
const mockTryAddCsvTexts = jest.fn<(...args: unknown[]) => Promise<boolean>>();
jest.unstable_mockModule('../../../../src/write/cap/csv', () => ({
    tryAddCsvTexts: mockTryAddCsvTexts,
    addCsvTexts: jest.fn()
}));

// Import modules under test AFTER mocking
const { tryAddPropertiesTexts } = await import('../../../../src/write/cap/properties');

describe('properties', () => {
    describe('tryAddPropertiesTexts', () => {
        const path = join('root', '_i18n', 'i18n');
        const i18nPath = join('root', '_i18n', 'i18n.properties');
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
            jest.restoreAllMocks();
        });
        test('i18n.properties file does not exits - completed with tryAddCsvTexts', async () => {
            mockDoesExist.mockResolvedValue(false);
            mockTryAddCsvTexts.mockResolvedValue(true);
            mockWriteFile.mockResolvedValue(undefined);
            mockReadFile.mockResolvedValue('');
            const result = await tryAddPropertiesTexts(env, path, entries);
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, i18nPath);
            expect(mockTryAddCsvTexts).toHaveBeenNthCalledWith(1, env, path, entries, undefined);
            expect(mockWriteFile).toHaveBeenCalledTimes(0);
            expect(mockReadFile).toHaveBeenCalledTimes(0);
        });
        test('i18n.properties file does not exits and tryAddCsvTexts did not succeed - create new .properties file with content', async () => {
            mockDoesExist.mockResolvedValue(false);
            mockTryAddCsvTexts.mockResolvedValue(false);
            mockWriteFile.mockResolvedValue(undefined);
            mockReadFile.mockResolvedValue('');
            const result = await tryAddPropertiesTexts(env, path, entries);
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, i18nPath);
            expect(mockTryAddCsvTexts).toHaveBeenNthCalledWith(1, env, path, entries, undefined);
            expect(mockWriteFile).toHaveBeenNthCalledWith(1, i18nPath, '\n#XFLD,27\nNewKey=New Value\n', undefined);
            expect(mockReadFile).toHaveBeenCalledTimes(0);
        });
        test('i18n.properties file does not exits and tryAddCsvTexts did not succeed - create new .properties file with content - mem-fs-editor', async () => {
            mockDoesExist.mockResolvedValue(false);
            mockTryAddCsvTexts.mockResolvedValue(false);
            mockWriteFile.mockResolvedValue('');
            const memFs = create(createStorage());
            const newEntries = [{ key: 'NewKey', value: 'New Value' }];
            const result = await tryAddPropertiesTexts(env, path, newEntries, memFs);
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenNthCalledWith(1, i18nPath);
            expect(mockTryAddCsvTexts).toHaveBeenNthCalledWith(1, env, path, newEntries, memFs);
            expect(mockWriteFile).toHaveBeenNthCalledWith(1, i18nPath, '\n#XFLD,27\nNewKey=New Value\n', memFs);
        });
        describe('add to existing .properties file', () => {
            test('file ends with new line', async () => {
                mockDoesExist.mockResolvedValue(true);
                mockReadFile.mockResolvedValue('key = value\n');
                mockWriteFile.mockResolvedValue(undefined);
                const result = await tryAddPropertiesTexts(env, path, [{ key: 'NewKey', value: 'New Value' }]);
                expect(result).toEqual(true);
                expect(mockDoesExist).toHaveBeenCalledTimes(1);
                expect(mockTryAddCsvTexts).toHaveBeenCalledTimes(0);
                expect(mockReadFile).toHaveBeenCalledTimes(1);
                expect(mockWriteFile).toHaveBeenNthCalledWith(
                    1,
                    i18nPath,
                    'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                    undefined
                );
            });
            test('file does not end with new line', async () => {
                mockDoesExist.mockResolvedValue(true);
                mockReadFile.mockResolvedValue('key = value');
                mockWriteFile.mockResolvedValue(undefined);
                const result = await tryAddPropertiesTexts(env, path, [{ key: 'NewKey', value: 'New Value' }]);
                expect(result).toEqual(true);
                expect(mockDoesExist).toHaveBeenCalledTimes(1);
                expect(mockTryAddCsvTexts).toHaveBeenCalledTimes(0);
                expect(mockReadFile).toHaveBeenCalledTimes(1);
                expect(mockWriteFile).toHaveBeenNthCalledWith(
                    1,
                    i18nPath,
                    'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                    undefined
                );
            });
            test('multiple entries', async () => {
                mockDoesExist.mockResolvedValue(true);
                mockReadFile.mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
                mockWriteFile.mockResolvedValue(undefined);
                const result = await tryAddPropertiesTexts(env, path, [
                    { key: 'NewKey', value: 'New Value' },
                    { key: 'NewKey2', value: 'New Value2' }
                ]);
                expect(result).toEqual(true);
                expect(mockDoesExist).toHaveBeenCalledTimes(1);
                expect(mockTryAddCsvTexts).toHaveBeenCalledTimes(0);
                expect(mockReadFile).toHaveBeenCalledTimes(1);
                expect(mockWriteFile).toHaveBeenCalledTimes(1);
                expect(mockWriteFile).toHaveBeenNthCalledWith(
                    1,
                    i18nPath,
                    '\n#XFLD,27\nExistingKey=New Value\n\n#XFLD,27\nNewKey=New Value\n\n#XFLD,30\nNewKey2=New Value2\n',
                    undefined
                );
            });
        });
    });
});
