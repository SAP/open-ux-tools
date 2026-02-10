import { createApplicationAccess, FileName, getSpecificationModuleFromCache } from '@sap-ux/project-access';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createEntityChoices, getSpecification } from '../../src/data-download/prompts/prompt-helpers';
import { getEntityModel } from '../../src/data-download/utils';
import * as commandMock from '@sap-ux/project-access/dist/command';
import * as fileMock from '@sap-ux/project-access/dist/file';
import type { Specification } from '@sap/ux-specification/dist/types/src';
import { ConsoleTransport, LogLevel, ToolsLogger } from '@sap-ux/logger';

const readJSONOriginal = fileMock.readJSON;

describe('Test prompt-helpers', () => {
    test('should create entity set choices based on app model (from specification)', async () => {
        const startTime = Date.now();
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
        const time1 = Date.now();
        console.log('Time 1:', time1 - startTime);
        const appAccess = await createApplicationAccess(appPath);
        if (appAccess) {
            console.log('Created app access');
        }
        const time2 = Date.now();
        console.log('Time 2:', time2 - time1);
        // Usually loaded from backend, use local copy for testing
        const metadata = await readFile(join(appPath, '/webapp/localService/mainService/metadata.xml'), 'utf8');
        const time3 = Date.now();
        console.log('Time 3:', time3 - time2);
        const logger = new ToolsLogger({ logLevel: LogLevel.Debug, transports: [new ConsoleTransport()] });
        const specResult = await getSpecificationModuleFromCache(appAccess.app.appRoot, { logger });
        const time4 = Date.now();
        console.log('Time 4:', time4 - time3);
        if (specResult) {
            console.log('Got spec result');
        }
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
    }, 20000);
});
