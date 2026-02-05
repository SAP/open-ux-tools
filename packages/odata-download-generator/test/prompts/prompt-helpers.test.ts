import type { EntityType } from '@sap-ux/vocabularies-types';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEntityChoices } from '../../src/data-download/prompts/prompt-helpers';
import { type Entity } from '../../src/data-download/types';
import { getEntityModel } from '../../src/data-download/utils';
import { createApplicationAccess } from '@sap-ux/project-access';

describe('Test propt-helpers', () => {
    test('should create entity set choices', async () => {
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
