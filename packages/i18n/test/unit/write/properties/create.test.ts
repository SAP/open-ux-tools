import { createPropertiesI18nEntry } from '../../../../src';
import * as utilsWrite from '../../../../src/write/utils';
import * as utils from '../../../../src/utils';
import { promises } from 'fs';

describe('create', () => {
    describe('createPropertiesI18nEntry', () => {
        beforeEach(() => jest.resetAllMocks());
        describe('i18n.properties does not exist', () => {
            test('without root', async () => {
                const writeToExistingI18nPropertiesFileSpy = jest
                    .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                    .mockResolvedValue(true);
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
                const newEntries = [
                    {
                        key: 'NewKey',
                        value: 'New Value'
                    }
                ];
                const result = await createPropertiesI18nEntry('i18n.properties', newEntries);
                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', '# Resource bundle \n', {
                    encoding: 'utf8'
                });
                expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', newEntries);
            });
            test('with root', async () => {
                const writeToExistingI18nPropertiesFileSpy = jest
                    .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                    .mockResolvedValue(true);
                const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(false);
                const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
                const newEntries = [
                    {
                        key: 'NewKey',
                        value: 'New Value'
                    }
                ];
                const result = await createPropertiesI18nEntry('i18n.properties', newEntries, 'root/my-project');
                expect(result).toEqual(true);
                expect(doesExistSpy).toHaveBeenCalledTimes(1);
                expect(writeFileSpy).toHaveBeenNthCalledWith(
                    1,
                    'i18n.properties',
                    '# This is the resource bundle for my-project\n',
                    {
                        encoding: 'utf8'
                    }
                );
                expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', newEntries);
            });
        });
        test('boolean', async () => {
            const writeToExistingI18nPropertiesFileSpy = jest
                .spyOn(utilsWrite, 'writeToExistingI18nPropertiesFile')
                .mockResolvedValue(true);
            const doesExistSpy = jest.spyOn(utils, 'doesExist').mockResolvedValue(true);
            const newEntries = [
                {
                    key: 'NewKey',
                    value: 'New Value'
                }
            ];
            const result = await createPropertiesI18nEntry('i18n.properties', newEntries);
            expect(result).toEqual(true);
            expect(doesExistSpy).toHaveBeenCalledTimes(1);
            expect(writeToExistingI18nPropertiesFileSpy).toHaveBeenNthCalledWith(1, 'i18n.properties', newEntries);
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
            const result = createPropertiesI18nEntry('i18n.properties', newEntries);
            expect(doesExistSpy).toHaveBeenCalledTimes(1);
            expect(result).rejects.toThrowError('should-throw-error');
        });
    });
});
