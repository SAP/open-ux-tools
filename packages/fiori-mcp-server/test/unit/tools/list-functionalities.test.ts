import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import type { ListFunctionalitiesOutput } from '../../../src/types';
import { listFunctionalities } from '../../../src/tools';
import { ensureSpecificationLoaded, mockSpecificationReadAppWithModel } from '../utils';
import * as projectUtils from '../../../src/page-editor-api/project';
import { join } from 'node:path';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

const appPathLropV4 = join(__dirname, '../../test-data/original/lrop');

describe('listFunctionalities', () => {
    const appPath = 'testApplicationPath';
    let readAppMock = jest.fn();
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const getManifestSpy: jest.SpyInstance = jest.spyOn(projectUtils, 'getManifest');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    const applications: { [key: string]: openUxProjectAccessDependency.ApplicationAccess } = {};
    beforeAll(async () => {
        // Create application access can take more time on slower machines
        applications[appPathLropV4] = await openUxProjectAccessDependency.createApplicationAccess(appPathLropV4);
        // Ensure spec is loaded - first import is most costly
        await ensureSpecificationLoaded();
    }, 10000);
    beforeEach(async () => {
        readAppMock = jest.fn().mockResolvedValue({ files: [] });
        getManifestSpy.mockResolvedValue({ manifest: true });
        findProjectRootSpy.mockImplementation(async (path: string): Promise<string> => path);
        createApplicationAccessSpy.mockImplementation((rootPath: string) => {
            return {
                getAppId: () => 'dummy-id',
                app: {
                    changes: 'changes'
                },
                project: {
                    root: 'root',
                    apps: {
                        ['dummy-id']: {}
                    }
                },
                getSpecification: () => ({
                    readApp: readAppMock,
                    getApiVersion: () => ({ version: '99' })
                })
            };
        });
    });

    test('call with valid app and blank application', async () => {
        const functionalities = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(functionalities.applicationPath).toEqual(appPath);
        expect(functionalities.functionalities.map((functionality) => functionality.functionalityId)).toEqual([
            'add-page',
            'generate-fiori-ui-application-cap',
            'delete-page',
            'create-controller-extension',
            'generate-fiori-ui-application',
            'fetch-service-metadata'
        ]);
    });

    test('call with project without apps', async () => {
        createApplicationAccessSpy.mockImplementation((rootPath: string) => {
            return {
                getAppId: () => '',
                project: {
                    apps: {}
                },
                getSpecification: () => ({
                    readApp: readAppMock
                })
            };
        });
        const functionalities = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(readAppMock).toHaveBeenCalledTimes(0);
        expect(functionalities.applicationPath).toEqual(appPath);
        expect(functionalities.functionalities.map((functionality) => functionality.functionalityId)).toEqual([
            'add-page',
            'generate-fiori-ui-application-cap',
            'delete-page',
            'create-controller-extension',
            'generate-fiori-ui-application',
            'fetch-service-metadata'
        ]);
    });

    test('call with valid app and data', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        const result = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(result.functionalities).toMatchSnapshot();
        expect(readAppMock).toHaveBeenCalledTimes(1);
    });

    test('Error during reading functionalities', async () => {
        readAppMock.mockImplementation(() => {
            throw new Error('Dummy');
        });
        const result = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(result).toEqual('Error while trying to list functionalities: Dummy');
    });
});
