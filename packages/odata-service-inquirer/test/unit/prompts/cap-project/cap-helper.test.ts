import * as sapuxProjectAccess from '@sap-ux/project-access';
import { constants } from 'fs';
import { initI18nOdataServiceInquirer } from '../../../../src/i18n';
import { getCapProjectChoices } from '../../../../src/prompts/datasources/cap-project/cap-helpers';

const accessFilePathsOK = ['/test/mock/bookshop/srv/', '/test/mock/bookshop/23/srv/', '/test/mock/flight/srv/'];

jest.mock('fs/promises', () => ({
    ...jest.requireActual('fs/promises'),
    access: jest.fn().mockImplementation(async (filePath: string, mode: number) => {
        if (accessFilePathsOK.indexOf(filePath) > -1 && mode === constants.F_OK) {
            return Promise.resolve();
        }
        throw Error('File not accessible');
    })
}));

describe('cap-helper', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    test('getCapProjectChoices', async () => {
        const findCapProjectsSpy = jest
            .spyOn(sapuxProjectAccess, 'findCapProjects')
            .mockResolvedValue(['/test/mock/1/bookshop', '/test/mock/2/bookshop', '/test/mock/flight']);

        //const detectedWorkspaceFolder = [bookshop, flights, bookshop2];
        const choices = await getCapProjectChoices(['/test/mock/']);
        expect(choices).toMatchInlineSnapshot(`
            [
              {
                "name": "bookshop (/test/mock/1/bookshop)",
                "value": {
                  "app": "app/",
                  "db": "db/",
                  "folderName": "bookshop",
                  "path": "/test/mock/1/bookshop",
                  "srv": "srv/",
                },
              },
              {
                "name": "bookshop (/test/mock/2/bookshop)",
                "value": {
                  "app": "app/",
                  "db": "db/",
                  "folderName": "bookshop",
                  "path": "/test/mock/2/bookshop",
                  "srv": "srv/",
                },
              },
              {
                "name": "flight",
                "value": {
                  "app": "app/",
                  "db": "db/",
                  "folderName": "flight",
                  "path": "/test/mock/flight",
                  "srv": "srv/",
                },
              },
              {
                "name": "Manually select CAP project folder path",
                "value": "enterCapPath",
              },
            ]
        `);
        expect(findCapProjectsSpy).toHaveBeenCalledWith({ 'wsFolders': ['/test/mock/'] });
    });
});
