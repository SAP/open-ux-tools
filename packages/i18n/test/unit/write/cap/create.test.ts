import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

// Mock functions
const mockGetCapI18nFolder = jest.fn<(...args: any[]) => Promise<string>>();
const mockTryAddJsonTexts = jest.fn<(...args: any[]) => Promise<boolean>>();
const mockTryAddPropertiesTexts = jest.fn<(...args: any[]) => Promise<boolean>>();
const mockTryAddCsvTexts = jest.fn<(...args: any[]) => Promise<boolean>>();

// Get real utils for pass-through
const realUtils = await import('../../../../src/utils/index');

// Mock the utils module
jest.unstable_mockModule('../../../../src/utils', () => ({
    getI18nConfiguration: realUtils.getI18nConfiguration,
    getI18nFolderNames: realUtils.getI18nFolderNames,
    getCapI18nFiles: realUtils.getCapI18nFiles,
    resolveCapI18nFolderForFile: realUtils.resolveCapI18nFolderForFile,
    csvPath: realUtils.csvPath,
    jsonPath: realUtils.jsonPath,
    capPropertiesPath: realUtils.capPropertiesPath,
    printPropertiesI18nAnnotation: realUtils.printPropertiesI18nAnnotation,
    printPropertiesI18nEntry: realUtils.printPropertiesI18nEntry,
    doesExist: realUtils.doesExist,
    readFile: realUtils.readFile,
    writeFile: realUtils.writeFile,
    getI18nMaxLength: realUtils.getI18nMaxLength,
    getI18nTextType: realUtils.getI18nTextType,
    applyIndent: realUtils.applyIndent,
    discoverIndent: realUtils.discoverIndent,
    discoverLineEnding: realUtils.discoverLineEnding,
    convertToCamelCase: realUtils.convertToCamelCase,
    convertToPascalCase: realUtils.convertToPascalCase,
    extractI18nKey: realUtils.extractI18nKey,
    getI18nUniqueKey: realUtils.getI18nUniqueKey,
    extractDoubleCurlyBracketsKey: realUtils.extractDoubleCurlyBracketsKey,
    getCapI18nFolder: mockGetCapI18nFolder
}));

// Mock the sub-modules
jest.unstable_mockModule('../../../../src/write/cap/json', () => ({
    tryAddJsonTexts: mockTryAddJsonTexts,
    addJsonTexts: jest.fn()
}));

jest.unstable_mockModule('../../../../src/write/cap/properties', () => ({
    tryAddPropertiesTexts: mockTryAddPropertiesTexts
}));

jest.unstable_mockModule('../../../../src/write/cap/csv', () => ({
    tryAddCsvTexts: mockTryAddCsvTexts,
    addCsvTexts: jest.fn()
}));

// Import after mocking
const { createCapI18nEntries } = await import('../../../../src/write/cap/create');

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
        mockGetCapI18nFolder.mockResolvedValue(pathToFolder);
        mockTryAddJsonTexts.mockResolvedValue(true);
        mockTryAddPropertiesTexts.mockResolvedValue(true);
        mockTryAddCsvTexts.mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(mockGetCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(mockTryAddJsonTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddPropertiesTexts).toHaveBeenCalledTimes(0);
        expect(mockTryAddCsvTexts).toHaveBeenCalledTimes(0);
    });
    test('existing properties file', async () => {
        // arrange
        mockGetCapI18nFolder.mockResolvedValue(pathToFolder);
        mockTryAddJsonTexts.mockResolvedValue(false);
        mockTryAddPropertiesTexts.mockResolvedValue(true);
        mockTryAddCsvTexts.mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(mockGetCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(mockTryAddJsonTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddPropertiesTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddCsvTexts).toHaveBeenCalledTimes(0);
    });
    test('existing csv file', async () => {
        // arrange
        mockGetCapI18nFolder.mockResolvedValue(pathToFolder);
        mockTryAddJsonTexts.mockResolvedValue(false);
        mockTryAddPropertiesTexts.mockResolvedValue(false);
        mockTryAddCsvTexts.mockResolvedValue(true);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeTruthy();
        expect(mockGetCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(mockTryAddJsonTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddPropertiesTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddCsvTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
    });
    test('existing csv file - mem-fs-editor', async () => {
        // arrange
        mockGetCapI18nFolder.mockResolvedValue(pathToFolder);
        mockTryAddJsonTexts.mockResolvedValue(false);
        mockTryAddPropertiesTexts.mockResolvedValue(false);
        mockTryAddCsvTexts.mockResolvedValue(true);
        const memFs = create(createStorage());
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env, memFs);
        // assert
        expect(result).toBeTruthy();
        expect(mockGetCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, memFs);
        expect(mockTryAddJsonTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, memFs);
        expect(mockTryAddPropertiesTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, memFs);
        expect(mockTryAddCsvTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, memFs);
    });
    test('none existing files', async () => {
        // arrange
        mockGetCapI18nFolder.mockResolvedValue(pathToFolder);
        mockTryAddJsonTexts.mockResolvedValue(false);
        mockTryAddPropertiesTexts.mockResolvedValue(false);
        mockTryAddCsvTexts.mockResolvedValue(false);
        // act
        const result = await createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        expect(result).toBeFalsy();
        expect(mockGetCapI18nFolder).toHaveBeenNthCalledWith(1, 'root', 'path', env, undefined);
        expect(mockTryAddJsonTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddPropertiesTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
        expect(mockTryAddCsvTexts).toHaveBeenNthCalledWith(1, env, pathToFolderI18n, newEntries, undefined);
    });
    test('exception / error case', async () => {
        // arrange
        mockGetCapI18nFolder.mockResolvedValue(pathToFolder);
        mockTryAddJsonTexts.mockImplementation(() => {
            throw new Error('should-throw-error');
        });
        // act
        const result = createCapI18nEntries('root', 'path', newEntries, env);
        // assert
        return expect(result).rejects.toThrow('should-throw-error');
    });
});
