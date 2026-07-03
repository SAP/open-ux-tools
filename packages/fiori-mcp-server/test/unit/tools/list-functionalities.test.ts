import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ListFunctionalitiesOutput } from '../../../src/types/index.js';
import { ensureSpecificationLoaded, mockSpecificationReadAppWithModel } from '../utils.js';
import type { ApplicationAccess } from '@sap-ux/project-access';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock @sap-ux/project-access with controllable functions
const actualProjectAccess = await import('@sap-ux/project-access');
const mockFindProjectRoot = jest.fn<any>();
const mockCreateApplicationAccess = jest.fn<any>();
const mockGetSpecificationModuleFromCache = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    findProjectRoot: mockFindProjectRoot,
    createApplicationAccess: mockCreateApplicationAccess,
    getSpecificationModuleFromCache: mockGetSpecificationModuleFromCache
}));

// Mock getManifest from project utils
const actualProjectUtils = await import('../../../src/page-editor-api/project.js');
const mockGetManifest = jest.fn<any>();
jest.unstable_mockModule('../../../src/page-editor-api/project', () => ({
    ...actualProjectUtils,
    getManifest: mockGetManifest
}));

// Dynamic imports after mocks
const { listFunctionalities } = await import('../../../src/tools/index.js');

const appPathLropV4 = join(__dirname, '../../test-data/original/lrop');

describe('listFunctionalities', () => {
    const appPath = 'testApplicationPath';
    let readAppMock = jest.fn();
    let getSpecificationMock = jest.fn();
    const applications: { [key: string]: ApplicationAccess } = {};
    beforeAll(async () => {
        // Create application access can take more time on slower machines
        applications[appPathLropV4] = await actualProjectAccess.createApplicationAccess(appPathLropV4);
        // Ensure spec is loaded - first import is most costly
        await ensureSpecificationLoaded();
    }, 10000);
    beforeEach(async () => {
        readAppMock = jest.fn().mockResolvedValue({ files: [] });
        mockGetManifest.mockResolvedValue({ manifest: true });
        mockFindProjectRoot.mockImplementation(async (path: string): Promise<string> => path);
        getSpecificationMock = jest.fn().mockResolvedValue({
            readApp: readAppMock,
            getApiVersion: () => ({ version: '99' })
        });
        mockCreateApplicationAccess.mockImplementation((rootPath) => {
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
                getSpecification: getSpecificationMock
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
            'delete-page',
            'create-controller-extension'
        ]);
    });

    test('call with project without apps', async () => {
        mockCreateApplicationAccess.mockImplementation((rootPath) => {
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
            'delete-page',
            'create-controller-extension'
        ]);
    });

    test('call with valid app and data', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        const result = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        expect(result.functionalities).toHaveLength(107);
        expect(result.functionalities).toMatchSnapshot();
        expect(readAppMock).toHaveBeenCalledTimes(1);
        expect(getSpecificationMock).toHaveBeenCalledTimes(1);
        expect(mockGetSpecificationModuleFromCache).toHaveBeenCalledTimes(0);
    });

    test('Fallback if older specification loaded - load from global cache', async () => {
        mockSpecificationReadAppWithModel(readAppMock, appPathLropV4, applications);
        // Mock specification to return old version
        getSpecificationMock.mockResolvedValue({
            readApp: readAppMock,
            getApiVersion: () => ({ version: '1' })
        });
        // mock spec from global cache
        mockGetSpecificationModuleFromCache.mockResolvedValue({
            readApp: readAppMock,
            getApiVersion: () => ({ version: '99' })
        });
        // Act
        const result = (await listFunctionalities({
            appPath
        })) as ListFunctionalitiesOutput;
        // Check
        expect(result.functionalities).toHaveLength(107);
        expect(readAppMock).toHaveBeenCalledTimes(1);
        expect(getSpecificationMock).toHaveBeenCalledTimes(1);
        expect(mockGetSpecificationModuleFromCache).toHaveBeenCalledTimes(1);
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
