import { createApplicationAccess, FileName } from '@sap-ux/project-access';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEntityChoices, getSpecification } from '../../src/data-download/prompts/prompt-helpers';
import { getEntityModel } from '../../src/data-download/utils';
import * as commandMock from '@sap-ux/project-access/dist/command';
import * as fileMock from '@sap-ux/project-access/dist/file';
import type { Specification } from '@sap/ux-specification/dist/types/src';

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
        const specResult = await getSpecification(appAccess);
        if (typeof specResult === 'string') {
            throw new Error(specResult);
        }
        // Load the full entity model
        const entityModel = await getEntityModel(appAccess, specResult as Specification, metadata);
        if (!entityModel) {
            throw new Error('Expected entity model is undefined');
        }

        const entityChoices = createEntityChoices(entityModel.listEntity, entityModel?.pageObjectEntities);
        expect(entityChoices).toMatchSnapshot();
    }, 10000);
});
