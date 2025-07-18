import { writeToExistingI18nPropertiesFile } from '../../../../src/write/utils';
import { SapShortTextType } from '../../../../src';
import * as utils from '../../../../src/utils';
import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

describe('index', () => {
    describe('writeToExistingI18nPropertiesFile', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });
        const entries = [
            {
                key: 'NewKey',
                value: 'New Value'
            }
        ];
        test('file ends with new line', async () => {
            // arrange
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('key = value\n');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', entries);
            // assert
            expect(result).toEqual(true);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                undefined
            );
        });
        test('file does not end with new line', async () => {
            // arrange
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('key = value');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ]);
            // assert
            expect(result).toEqual(true);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                undefined
            );
        });
        test('multiple entries', async () => {
            // arrange
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
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
            expect(readFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                '\n#XFLD,27\nExistingKey=New Value\n\n#XFLD,27\nNewKey=New Value\n\n#XFLD,30\nNewKey2=New Value2\n',
                undefined
            );
        });
        describe('with annotation', () => {
            test('string', async () => {
                // arrange
                const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
                const readFileSpy = jest
                    .spyOn(utils, 'readFile')
                    .mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
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
                expect(readFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '\n#XFLD,27\nExistingKey=New Value\n\n#XTIT: Name\nNewKey=New Value\n',
                    undefined
                );
            });
            test('object', async () => {
                // arrange
                const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
                const readFileSpy = jest
                    .spyOn(utils, 'readFile')
                    .mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
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
                expect(readFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', undefined);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
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
                jest.spyOn(utils, 'writeFile').mockImplementation(jest.fn());
                jest.spyOn(utils, 'printPropertiesI18nEntry').mockImplementation(
                    jest.fn((key, value, annotation) => {
                        return annotation ? `${key}=${value} # ${annotation}\n` : `${key}=${value}\n`;
                    })
                );
            });

            it('removes specified keys and adds new entries', async () => {
                jest.spyOn(utils, 'readFile').mockResolvedValue(
                    ['# Comment', '', 'key1=oldValue1', 'key2=oldValue2', '', 'key3=oldValue3'].join('\n')
                );
                const newI18nEntries = [
                    { key: 'key4', value: 'newValue4', annotation: undefined },
                    { key: 'key5', value: 'newValue5', annotation: 'Some annotation' }
                ];
                const keysToRemove = ['key2'];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(utils.writeFile).toHaveBeenCalledWith(
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
                jest.spyOn(utils, 'readFile').mockResolvedValue(
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

                expect(utils.writeFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['key3=oldValue3', 'key6=newValue6', ''].join('\n'),
                    fs
                );
            });

            it('adds new entries if no keys are removed', async () => {
                jest.spyOn(utils, 'readFile').mockResolvedValue('key1=oldValue1\nkey2=oldValue2');
                const newI18nEntries = [{ key: 'key7', value: 'newValue7', annotation: undefined }];
                const keysToRemove: string[] = [];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(utils.writeFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['key1=oldValue1', 'key2=oldValue2', 'key7=newValue7', ''].join('\n'),
                    fs
                );
            });

            it('writes only new entries if file is empty', async () => {
                jest.spyOn(utils, 'readFile').mockResolvedValue('');
                const newI18nEntries = [
                    { key: 'key8', value: 'newValue8', annotation: undefined },
                    { key: 'key9', value: 'newValue9', annotation: undefined }
                ];
                const keysToRemove: string[] = [];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                expect(utils.writeFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['key8=newValue8', 'key9=newValue9', ''].join('\n'),
                    fs
                );
            });

            it('removes comment/empty lines above a removed key', async () => {
                jest.spyOn(utils, 'readFile').mockResolvedValue(
                    ['# Comment', '', 'key1=oldValue1', 'key2=oldValue2', '', 'key3=oldValue3'].join('\n')
                );
                const newI18nEntries = [{ key: 'key4', value: 'newValue4', annotation: undefined }];
                const keysToRemove = ['key3'];

                await writeToExistingI18nPropertiesFile(i18nFilePath, newI18nEntries, keysToRemove, fs);

                // The comment and empty line above key2 should remain, but if there were only comments/empty lines above, they would be removed.
                expect(utils.writeFile).toHaveBeenCalledWith(
                    i18nFilePath,
                    ['# Comment', '', 'key1=oldValue1', 'key2=oldValue2', 'key4=newValue4', ''].join('\n'),
                    fs
                );
            });
        });
        test('mem-fs-editor', async () => {
            // arrange
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('key = value\n');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const memFs = create(createStorage());
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', entries, [], memFs);
            // assert
            expect(result).toEqual(true);
            expect(readFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', memFs);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                memFs
            );
        });
    });
});
