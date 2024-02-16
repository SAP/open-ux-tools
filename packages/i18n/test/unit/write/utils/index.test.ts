import { writeToExistingI18nPropertiesFile } from '../../../../src/write/utils';
import { SapShortTextType } from '../../../../src';
import * as utils from '../../../../src/utils';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

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
        test('mem-fs-editor', async () => {
            // arrange
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('key = value\n');
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const memFs = create(createStorage());
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', entries, memFs);
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
