import { createPropertiesI18nEntries } from '../../../../src';
import * as utilsWrite from '../../../../src/write/utils';
import * as utils from '../../../../src/utils';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { basename } from 'path';

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
                const writeToExistingI18nPropertiesFileSpy = jest
                    .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                    .mockResolvedValue(true);
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
                const result = await createPropertiesI18nEntries('i18n.properties', newEntries);
                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', '# Resource bundle \n', undefined);
                expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    newEntries,
                    undefined
                );
            });
            test('with root', async () => {
                const writeToExistingI18nPropertiesFileSpy = jest
                    .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                    .mockResolvedValue(true);
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
                const result = await createPropertiesI18nEntries('i18n.properties', newEntries, 'root/my-project');
                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '# This is the resource bundle for my-project\n',
                    undefined
                );
                expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    newEntries,
                    undefined
                );
            });
            test('mem-fs-editor', async () => {
                const writeToExistingI18nPropertiesFileSpy = jest
                    .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                    .mockResolvedValue(true);
                const memFs = create(createStorage());
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();

                const result = await createPropertiesI18nEntries('i18n.properties', newEntries, undefined, memFs);

                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(0);
                expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', '# Resource bundle \n', memFs);
                expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    newEntries,
                    memFs
                );
            });
        });
        test('success', async () => {
            const writeToExistingI18nPropertiesFileSpy = jest
                .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                .mockResolvedValue(true);
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const result = await createPropertiesI18nEntries('i18n.properties', newEntries);
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenCalledTimes(1);
            expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(
                1,
                'i18n.properties',
                newEntries,
                undefined
            );
        });
        test('create a new i18n file if it does not exist in both real and virtual file systems', async () => {
            const i18nFilePath = 'path/to/i18n.properties';
            const root = 'path/to/root';
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
            const memFs = create(createStorage());
            memFs.exists = jest.fn().mockReturnValue(false);
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const writeToExistingI18nPropertiesFileSpy = jest
                .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                .mockResolvedValue(true);

            await createPropertiesI18nEntries(i18nFilePath, newEntries, root, memFs);

            expect(doesExistSpy).not.toHaveBeenCalled();
            expect(memFs.exists).toHaveBeenCalledWith(i18nFilePath);
            expect(writeFileSpy).toHaveBeenCalledWith(
                i18nFilePath,
                `# This is the resource bundle for ${basename(root)}\n`,
                memFs
            );
            expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenCalledWith(i18nFilePath, newEntries, memFs);
        });
        test('create a new i18n file if it exists in the real file system, but does not exist in the passed virtual file system', async () => {
            const i18nFilePath = 'path/to/i18n.properties';
            const root = 'path/to/root';
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const memFs = create(createStorage());
            memFs.exists = jest.fn().mockReturnValue(false);
            const writeFileSpy = jest.spyOn(utils, 'writeFile').mockResolvedValue();
            const writeToExistingI18nPropertiesFileSpy = jest
                .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                .mockResolvedValue(true);

            await createPropertiesI18nEntries(i18nFilePath, newEntries, root, memFs);

            expect(doesExistSpy).not.toHaveBeenCalled();
            expect(memFs.exists).toHaveBeenCalledWith(i18nFilePath);
            expect(writeFileSpy).toHaveBeenCalledWith(
                i18nFilePath,
                `# This is the resource bundle for ${basename(root)}\n`,
                memFs
            );
            expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenCalledWith(i18nFilePath, newEntries, memFs);
        });
        test('exception / error case', async () => {
            jest.spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile').mockImplementation(() => {
                throw new Error('should-throw-error');
            });
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
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
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(error.message).toEqual('should-throw-error');
            }
        });
    });
});
