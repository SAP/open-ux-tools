import fs from 'fs';
import { writeToExistingI18nPropertiesFile } from '../../../../src/write/utils';
describe('index', () => {
    describe('writeToExistingI18nPropertiesFile', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });
        test('file ends with new line', async () => {
            // arrange
            const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('key = value\n');
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ]);
            // assert
            expect(result).toEqual(true);
            expect(readFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                {
                    encoding: 'utf8'
                }
            );
        });
        test('file does not end with new line', async () => {
            // arrange
            const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('key = value');
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            // act
            const result = await writeToExistingI18nPropertiesFile('i18n.properties', [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ]);
            // assert
            expect(result).toEqual(true);
            expect(readFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                {
                    encoding: 'utf8'
                }
            );
        });
        test('multiple entries', async () => {
            // arrange
            const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
            const readFileSpy = jest
                .spyOn(fs.promises, 'readFile')
                .mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
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
            expect(readFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenCalledTimes(1);
            expect(writeFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                '\n#XFLD,27\nExistingKey=New Value\n\n#XFLD,27\nNewKey=New Value\n\n#XFLD,30\nNewKey2=New Value2\n',
                {
                    encoding: 'utf8'
                }
            );
        });
        describe('with annotation', () => {
            test('string', async () => {
                // arrange
                const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
                const readFileSpy = jest
                    .spyOn(fs.promises, 'readFile')
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
                expect(readFileSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '\n#XFLD,27\nExistingKey=New Value\n\n#XTIT: Name\nNewKey=New Value\n',
                    {
                        encoding: 'utf8'
                    }
                );
            });
            test.todo('object');
        });
    });
});
