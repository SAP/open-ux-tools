import { jest } from '@jest/globals';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { basename } from 'node:path';
import type { Editor } from 'mem-fs-editor';

// Get real utils exports before mocking
const realUtils = await import('../../../../src/utils/index');

// Mock functions for utils
const mockDoesExist = jest.fn<typeof realUtils.doesExist>();
const mockWriteFile = jest.fn<(...args: any[]) => Promise<string | void>>();

// Mock functions for write/utils
const mockWriteToExistingI18nPropertiesFile = jest.fn<(...args: any[]) => Promise<boolean>>();

// Mock the utils module
jest.unstable_mockModule('../../../../src/utils', () => ({
    getI18nConfiguration: realUtils.getI18nConfiguration,
    getI18nFolderNames: realUtils.getI18nFolderNames,
    getCapI18nFiles: realUtils.getCapI18nFiles,
    resolveCapI18nFolderForFile: realUtils.resolveCapI18nFolderForFile,
    getCapI18nFolder: realUtils.getCapI18nFolder,
    csvPath: realUtils.csvPath,
    jsonPath: realUtils.jsonPath,
    capPropertiesPath: realUtils.capPropertiesPath,
    printPropertiesI18nAnnotation: realUtils.printPropertiesI18nAnnotation,
    printPropertiesI18nEntry: realUtils.printPropertiesI18nEntry,
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
    readFile: realUtils.readFile,
    doesExist: mockDoesExist,
    writeFile: mockWriteFile
}));

// Mock the write/utils module
jest.unstable_mockModule('../../../../src/write/utils', () => ({
    writeToExistingI18nPropertiesFile: mockWriteToExistingI18nPropertiesFile
}));

// Import after mocking
const { createPropertiesI18nEntries, removeAndCreateI18nEntries } = await import('../../../../src/write/properties/create');

describe('create', () => {
    describe('createPropertiesI18nEntries', () => {
        beforeEach(() => jest.resetAllMocks());
        const newEntries = [
            {
                key: 'NewKey',
                value: 'New Value'
            }
        ];
        describe('i18n.properties does not exist', () => {
            test('without root', async () => {
                mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);
                mockDoesExist.mockResolvedValue(false);
                mockWriteFile.mockResolvedValue();
                const result = await createPropertiesI18nEntries('i18n.properties', newEntries);
                expect(result).toEqual(true);
                expect(mockDoesExist).toHaveBeenCalledTimes(1);
                expect(mockWriteFile).toHaveBeenNthCalledWith(1, 'i18n.properties', '# Resource bundle \n', undefined);
                expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    newEntries,
                    [],
                    undefined
                );
            });
            test('with root', async () => {
                mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);
                mockDoesExist.mockResolvedValue(false);
                mockWriteFile.mockResolvedValue();
                const result = await createPropertiesI18nEntries('i18n.properties', newEntries, 'root/my-project');
                expect(result).toEqual(true);
                expect(mockDoesExist).toHaveBeenCalledTimes(1);
                expect(mockWriteFile).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '# This is the resource bundle for my-project\n',
                    undefined
                );
                expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    newEntries,
                    [],
                    undefined
                );
            });
            test('mem-fs-editor', async () => {
                mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);
                const memFs = create(createStorage());
                mockDoesExist.mockResolvedValue(false);
                mockWriteFile.mockResolvedValue();

                const result = await createPropertiesI18nEntries('i18n.properties', newEntries, undefined, memFs);

                expect(result).toEqual(true);
                expect(mockDoesExist).toHaveBeenCalledTimes(0);
                expect(mockWriteFile).toHaveBeenNthCalledWith(1, 'i18n.properties', '# Resource bundle \n', memFs);
                expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    newEntries,
                    [],
                    memFs
                );
            });
        });
        test('success', async () => {
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);
            mockDoesExist.mockResolvedValue(true);
            const result = await createPropertiesI18nEntries('i18n.properties', newEntries);
            expect(result).toEqual(true);
            expect(mockDoesExist).toHaveBeenCalledTimes(1);
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                newEntries,
                [],
                undefined
            );
        });
        test('create a new i18n file if it does not exist in both real and virtual file systems', async () => {
            const i18nFilePath = 'path/to/i18n.properties';
            const root = 'path/to/root';
            mockDoesExist.mockResolvedValue(false);
            const memFs = create(createStorage());
            memFs.exists = jest.fn().mockReturnValue(false);
            mockWriteFile.mockResolvedValue();
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await createPropertiesI18nEntries(i18nFilePath, newEntries, root, memFs);

            expect(mockDoesExist).not.toHaveBeenCalled();
            expect(memFs.exists).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteFile).toHaveBeenCalledWith(
                i18nFilePath,
                `# This is the resource bundle for ${basename(root)}\n`,
                memFs
            );
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, [], memFs);
        });
        test('create a new i18n file if it exists in the real file system, but does not exist in the passed virtual file system', async () => {
            const i18nFilePath = 'path/to/i18n.properties';
            const root = 'path/to/root';
            mockDoesExist.mockResolvedValue(true);
            const memFs = create(createStorage());
            memFs.exists = jest.fn().mockReturnValue(false);
            mockWriteFile.mockResolvedValue();
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await createPropertiesI18nEntries(i18nFilePath, newEntries, root, memFs);

            expect(mockDoesExist).not.toHaveBeenCalled();
            expect(memFs.exists).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteFile).toHaveBeenCalledWith(
                i18nFilePath,
                `# This is the resource bundle for ${basename(root)}\n`,
                memFs
            );
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, [], memFs);
        });
        test('exception / error case', async () => {
            mockWriteToExistingI18nPropertiesFile.mockImplementation(() => {
                throw new Error('should-throw-error');
            });
            mockDoesExist.mockResolvedValue(true);
            const newEntries = [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ];
            try {
                await createPropertiesI18nEntries('i18n.properties', newEntries);
                expect(false).toBeTruthy(); // should never happens.
            } catch (error) {
                expect(mockDoesExist).toHaveBeenCalledTimes(1);
                expect((error as Error).message).toEqual('should-throw-error');
            }
        });
    });

    describe('createOrReplaceI18nEntries', () => {
        const i18nFilePath = 'i18n.properties';
        const newEntries = [{ key: 'NewKey', value: 'New Value' }];
        const keysToRemove = ['OldKey'];
        const root = '/some/project/root';
        const memFs = { exists: jest.fn() } as unknown as Editor;

        beforeEach(() => {
            jest.resetAllMocks();
        });

        it('creates a new i18n file if it does not exist (real fs)', async () => {
            mockDoesExist.mockResolvedValue(false);
            mockWriteFile.mockResolvedValue();
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await removeAndCreateI18nEntries(i18nFilePath, newEntries, keysToRemove, root);

            expect(mockDoesExist).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteFile).toHaveBeenCalledWith(
                i18nFilePath,
                `# This is the resource bundle for ${basename(root)}\n`,
                undefined
            );
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, keysToRemove, undefined);
        });

        it('creates a new i18n file if it does not exist (mem-fs)', async () => {
            memFs.exists = jest.fn().mockReturnValue(false);
            mockWriteFile.mockResolvedValue();
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await removeAndCreateI18nEntries(i18nFilePath, newEntries, keysToRemove, root, memFs);

            expect(mockDoesExist).not.toHaveBeenCalled();
            expect(memFs.exists).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteFile).toHaveBeenCalledWith(
                i18nFilePath,
                `# This is the resource bundle for ${basename(root)}\n`,
                memFs
            );
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, keysToRemove, memFs);
        });

        it('calls replaceI18nProperties if file exists (real fs)', async () => {
            mockDoesExist.mockResolvedValue(true);
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await removeAndCreateI18nEntries(i18nFilePath, newEntries, keysToRemove);

            expect(mockDoesExist).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteFile).not.toHaveBeenCalled();
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, keysToRemove, undefined);
        });

        it('calls replaceI18nProperties if file exists (mem-fs)', async () => {
            memFs.exists = jest.fn().mockReturnValue(true);
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await removeAndCreateI18nEntries(i18nFilePath, newEntries, keysToRemove, root, memFs);

            expect(mockDoesExist).not.toHaveBeenCalled();
            expect(memFs.exists).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteFile).not.toHaveBeenCalled();
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, keysToRemove, memFs);
        });

        it('uses default keysToRemove and root', async () => {
            mockDoesExist.mockResolvedValue(true);
            mockWriteToExistingI18nPropertiesFile.mockResolvedValue(true);

            await removeAndCreateI18nEntries(i18nFilePath, newEntries);

            expect(mockDoesExist).toHaveBeenCalledWith(i18nFilePath);
            expect(mockWriteToExistingI18nPropertiesFile).toHaveBeenCalledWith(i18nFilePath, newEntries, [], undefined);
        });
    });
});
