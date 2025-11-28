import * as openUxProjectAccessDependency from '@sap-ux/project-access';
import type { ListFunctionalitiesOutput } from '../../../src/types';
import { listFunctionalities } from '../../../src/tools';
import { mockSpecificationImport } from '../utils';
import * as projectUtils from '../../../src/page-editor-api/project';

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/project-access') as object)
}));

describe('listFunctionalities', () => {
    const appPath = 'testApplicationPath';
    let importProjectMock = jest.fn();
    const findProjectRootSpy: jest.SpyInstance = jest.spyOn(openUxProjectAccessDependency, 'findProjectRoot');
    const getManifestSpy: jest.SpyInstance = jest.spyOn(projectUtils, 'getManifest');
    const createApplicationAccessSpy: jest.SpyInstance = jest.spyOn(
        openUxProjectAccessDependency,
        'createApplicationAccess'
    );
    beforeEach(async () => {
        importProjectMock = jest.fn().mockResolvedValue([]);
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
                    importProject: importProjectMock
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
                    importProject: importProjectMock
                })
            };
        });
        const functionalities = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(importProjectMock).toHaveBeenCalledTimes(0);
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
        mockSpecificationImport(importProjectMock);
        const result = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(result.functionalities).toMatchSnapshot();
        expect(importProjectMock).toHaveBeenCalledWith({
            manifest: { manifest: true },
            annotations: [],
            flex: []
        });
    });

    test('call with valid app and flex changes', async () => {
        jest.spyOn(openUxProjectAccessDependency, 'readFlexChanges').mockResolvedValue({
            file1: 'change1',
            file2: 'change2'
        });
        mockSpecificationImport(importProjectMock);
        await listFunctionalities({
            appPath
        });
        expect(importProjectMock).toHaveBeenCalledWith({
            manifest: { manifest: true },
            annotations: [],
            flex: ['change1', 'change2']
        });
    });

    test('Error during reading functionalities', async () => {
        importProjectMock.mockImplementation(() => {
            throw new Error('Dummy');
        });
        const result = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(result).toEqual('Error while trying to list functionalities: Dummy');
    });
});
