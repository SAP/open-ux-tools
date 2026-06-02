import { jest } from '@jest/globals';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

// Import real printPropertiesI18nEntry from the leaf module (not the barrel)
// This avoids caching the barrel so our mock can take effect
const { printPropertiesI18nEntry: realPrint } = await import('../../../../src/utils/print');

// Define mock functions for the I/O operations we want to control
const mockReadFile = jest.fn<(filePath: string, fs?: Editor) => Promise<string>>();
const mockWriteFile = jest.fn<(filePath: string, content: string, fs?: Editor) => Promise<string | void>>();
const mockPrintPropertiesI18nEntry = jest.fn<(key: string, value: string, annotation?: unknown) => string>();

// Mock the utils barrel module BEFORE importing anything that uses it
jest.unstable_mockModule('../../../../src/utils', async () => {
    // Import leaf modules directly to get real implementations
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
        // Override with mocks
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        printPropertiesI18nEntry: mockPrintPropertiesI18nEntry
    };
});

// Import modules under test AFTER mocking
const { writeToExistingI18nPropertiesFile } = await import('../../../../src/write/utils');
const { SapShortTextType } = await import('../../../../src');

describe('index', () => {
    describe('writeToExistingI18nPropertiesFile', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
            mockReadFile.mockReset();
            mockWriteFile.mockReset();
            mockPrintPropertiesI18nEntry.mockReset();
            // Default: use real printPropertiesI18nEntry
            mockPrintPropertiesI18nEntry.mockImplementation((key: string, value: string, annotation?: unknown) =>
                realPrint(key, value, annotation as string | undefined)
            );
        });
        const entries = [
            {
                key: 'NewKey',
                value: 'New Value'
            }
        ];
        test('file ends with new line', async () => {
            // arrange
            mockReadFile.mockResolvedValue('key = value\n');
            mockWriteFile.mockResolvedValue(undefined);
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', entries);
            // assert
            expect(result).toEqual(true);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                undefined
            );
        });
        test('file does not end with new line', async () => {
            // arrange
            mockReadFile.mockResolvedValue('key = value');
            mockWriteFile.mockResolvedValue(undefined);
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ]);
            // assert
            expect(result).toEqual(true);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                undefined
            );
        });
        test('multiple entries', async () => {
            // arrange
            mockWriteFile.mockResolvedValue(undefined);
            mockReadFile.mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                {
                    key: 'NewKey',
                    value: 'New Value'
                },
                {
                    key: 'NewKey2',
                    value: 'New Value2'
                }
            ]);
            // assert
            expect(result).toEqual(true);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                '\n#XFLD,27\nExistingKey=New Value\n\n#XFLD,27\nNewKey=New Value\n\n#XFLD,30\nNewKey2=New Value2\n',
                undefined
            );
        });
        describe('with annotation', () => {
            test('string', async () => {
                // arrange
                mockWriteFile.mockResolvedValue(undefined);
                mockReadFile.mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
                // act
                const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                    {
                        key: 'NewKey',
                        value: 'New Value',
                        annotation: 'TIT: Name'
                    }
                ]);
                // assert
                expect(result).toEqual(true);
                expect(mockReadFile).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
                expect(mockWriteFile).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '\n#XFLD,27\nExistingKey=New Value\n\n#XTIT: Name\nNewKey=New Value\n',
                    undefined
                );
            });
            test('object', async () => {
                // arrange
                mockWriteFile.mockResolvedValue(undefined);
                mockReadFile.mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
                // act
                const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                    {
                        key: 'NewKey',
                        value: 'New Value',
                        annotation: { textType: SapShortTextType.Label, maxLength: 27 }
                    }
                ]);
                // assert
                expect(result).toEqual(true);
                expect(mockReadFile).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
                expect(mockWriteFile).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '\n#XFLD,27\nExistingKey=New Value\n\n#XFLD,27\nNewKey=New Value\n',
                    undefined
                );
            });
        });
        describe('with keys to remove', () => {
            const i18nFilePath = '/path/to/i18n.properties';
            const fs: Editor = {} as Editor;

            beforeEach(() => {
                jest.clearAllMocks();
                mockWriteFile.mockImplementation(
                    jest.fn() as (filePath: string, content: string, fs?: Editor) => Promise<string | void>
                );
                mockPrintPropertiesI18nEntry.mockImplementation((key: string, value: string, annotation?: unknown) => {
                    return annotation ? `${key}=${value} # ${annotation}\n` : `${key}=${value}\n`;
                });
            });

            it('removes specified keys and adds new entries', async () => {
                mockReadFile.mockResolvedValue(
                    ['# Comment', '', 'key1=oldValue1', 'key2=oldValue2', '', 'key3=oldValue3'].join('\n')
                );
                const newI18nEntries = [
                    { key: 'key4', value: 'newValue4', annotation: undefined },
                    { key: 'key5', value: 'newValue5', annotation: 'Some annotation' }
                ];
                const keysToRemove = ['key2'];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(mockWriteFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    [
                        '# Comment',
                        '',
                        'key1=oldValue1',
                        'key3=oldValue3',
                        'key4=newValue4',
                        'key5=newValue5 # Some annotation',
                        ''
                    ].join('\n'),
                    fs
                );
            });

            it('removes multiple keys and handles empty lines/comments', async () => {
                mockReadFile.mockResolvedValue(
                    [
                        '# Comment above key1',
                        '',
                        'key1=oldValue1',
                        '',
                        '# Comment above key2',
                        'key2=oldValue2',
                        '',
                        'key3=oldValue3'
                    ].join('\n')
                );
                const newI18nEntries = [{ key: 'key6', value: 'newValue6', annotation: undefined }];
                const keysToRemove = ['key1', 'key2'];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(mockWriteFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['key3=oldValue3', 'key6=newValue6', ''].join('\n'),
                    fs
                );
            });

            it('adds new entries if no keys are removed', async () => {
                mockReadFile.mockResolvedValue('key1=oldValue1\nkey2=oldValue2');
                const newI18nEntries = [{ key: 'key7', value: 'newValue7', annotation: undefined }];
                const keysToRemove: string[] = [];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(mockWriteFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['key1=oldValue1', 'key2=oldValue2', 'key7=newValue7', ''].join('\n'),
                    fs
                );
            });

            it('writes only new entries if file is empty', async () => {
                mockReadFile.mockResolvedValue('');
                const newI18nEntries = [
                    { key: 'key8', value: 'newValue8', annotation: undefined },
                    { key: 'key9', value: 'newValue9', annotation: undefined }
                ];
                const keysToRemove: string[] = [];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(mockWriteFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['key8=newValue8', 'key9=newValue9', ''].join('\n'),
                    fs
                );
            });

            it('removes comment/empty lines above a removed key', async () => {
                mockReadFile.mockResolvedValue(
                    ['# Comment', '', 'key1=oldValue1', 'key2=oldValue2', '', 'key3=oldValue3'].join('\n')
                );
                const newI18nEntries = [{ key: 'key4', value: 'newValue4', annotation: undefined }];
                const keysToRemove = ['key3'];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(mockWriteFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['# Comment', '', 'key1=oldValue1', 'key2=oldValue2', 'key4=newValue4', ''].join('\n'),
                    fs
                );
            });
        });
        test('mem-fs-editor', async () => {
            // arrange
            mockReadFile.mockResolvedValue('key = value\n');
            mockWriteFile.mockResolvedValue(undefined);
            const memFs = create(createStorage());
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', entries, [], memFs);
            // assert
            expect(result).toEqual(true);
            expect(mockReadFile).toHaveBeenNthCalledWith(1, 'i18n.properties', memFs);
            expect(mockWriteFile).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                memFs
            );
        });
    });
});
