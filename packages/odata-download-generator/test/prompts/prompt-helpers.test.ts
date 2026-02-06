import { createApplicationAccess, FileName } from '@sap-ux/project-access';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEntityChoices } from '../../src/data-download/prompts/prompt-helpers';
import { getEntityModel } from '../../src/data-download/utils';
import * as commandMock from '@sap-ux/project-access/dist/command';
import * as fileMock from '@sap-ux/project-access/dist/file';

const readJSONOriginal = fileMock.readJSON;

describe('Test prompt-helpers', () => {
    test('should create entity set choices based on app model (from specification)', async () => {
        // Prevent spec from fetching versions and writing on test jobs
        jest.spyOn(commandMock, 'execNpmCommand').mockResolvedValueOnce('{"latest": "1.142.1"}');
        jest.spyOn(fileMock, 'writeFile').mockResolvedValueOnce();
        jest.spyOn(fileMock, 'readJSON').mockImplementation(async (path) =>
            path.endsWith(FileName.SpecificationDistTags)
                ? {
                      latest: '1.142.1'
                  }
                : readJSONOriginal(path)
        );
        // Load the test app
        const appPath = join(__dirname, '../test-data/test-apps/travel');
        const appAccess = await createApplicationAccess(appPath);
        // Usually loaded from backend, use local copy for testing
        const metadata = await readFile(join(appPath, '/webapp/localService/mainService/metadata.xml'), 'utf8');
        // Load the full entity model
        const entityModel = await getEntityModel(appAccess, metadata);
        if (!entityModel) {
            fail('Expected entity model is undefined');
        }

        const entityChoices = createEntityChoices(entityModel.listEntity, entityModel?.pageObjectEntities);
        expect(entityChoices).toMatchSnapshot();
    }, 10000);
});
