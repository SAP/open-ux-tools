import { tryAddPropertiesTexts } from '../../../../src/write/cap/properties';
import * as csv from '../../../../src/write/cap/csv';
import * as utils from '../../../../src/utils';
import fs from 'fs';
import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

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
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(true);
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            // act
            const result = await tryAddPropertiesTexts(env, path, entries);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, i18nPath);
            expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, path, entries, undefined);
            expect(writeFileSpy).toHaveBeenCalledTimes(0);
            expect(readFileSpy).toHaveBeenCalledTimes(0);
        });
        test('i18n.properties file does not exits and tryAddCsvTexts did not succeed - create new .properties file with content', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const readFileSpy = jest.spyOn(utils, 'readFile').mockResolvedValue('');
            // act
            const result = await tryAddPropertiesTexts(env, path, entries);
            // assert
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenNthCalledWith(1, i18nPath);
            expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, path, entries, undefined);
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, i18nPath, '\n#XFLD,27\nNewKey=New Value\n', undefined);
            expect(readFileSpy).toHaveBeenCalledTimes(0);
        });
        test('i18n.properties file does not exits and tryAddCsvTexts did not succeed - create new .properties file with content - mem-fs-editor', async () => {
            // arrange
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue('');
            const memFs = create(createStorage());
            // act
            const newEntries = [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ];
            const result = await tryAddPropertiesTexts(env, path, newEntries, memFs);
            // assert
            expect(result).toEqual(true);

            expect(doesExistSpy).toHaveBeenNthCalledWith(1, i18nPath);
            expect(tryAddCsvTextsSpy).toHaveBeenNthCalledWith(1, env, path, newEntries, memFs);
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, i18nPath, '\n#XFLD,27\nNewKey=New Value\n', memFs);
        });
        describe('add to existing .properties file', () => {
            test('file ends with new line', async () => {
                // arrange
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
                const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
                const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('key = value\n');
                // act
                const result = await tryAddPropertiesTexts(env, path, [
                    {
                        key: 'NewKey',
                        value: 'New Value'
                    }
                ]);
                // assert
                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
                expect(readFileSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    i18nPath,
                    'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                    {
                        encoding: 'utf8'
                    }
                );
            });
            test('file does not end with new line', async () => {
                // arrange
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
                const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
                const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue('key = value');
                // act
                const result = await tryAddPropertiesTexts(env, path, [
                    {
                        key: 'NewKey',
                        value: 'New Value'
                    }
                ]);
                // assert
                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
                expect(readFileSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    i18nPath,
                    'key = value\n\n#XFLD,27\nNewKey=New Value\n',
                    {
                        encoding: 'utf8'
                    }
                );
            });
            test('multiple entries', async () => {
                // arrange
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
                const tryAddCsvTextsSpy = jest.spyOn(csv, 'tryAddCsvTexts').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();
                const readFileSpy = jest
                    .spyOn(fs.promises, 'readFile')
                    .mockResolvedValue('\n#XFLD,27\nExistingKey=New Value');
                // act
                const result = await tryAddPropertiesTexts(env, path, [
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
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(tryAddCsvTextsSpy).toHaveBeenCalledTimes(0);
                expect(readFileSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    i18nPath,
                    '\n#XFLD,27\nExistingKey=New Value\n\n#XFLD,27\nNewKey=New Value\n\n#XFLD,30\nNewKey2=New Value2\n',
                    {
                        encoding: 'utf8'
                    }
                );
            });
        });
    });
});
