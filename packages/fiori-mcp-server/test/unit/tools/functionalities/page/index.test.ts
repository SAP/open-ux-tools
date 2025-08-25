import { join } from 'path';
import {
    ADD_PAGE_FUNCTIONALITY,
    addPageHandlers,
    DELETE_PAGE_FUNCTIONALITY,
    deletePageHandlers
} from '../../../../../src/tools/functionalities/page';
import { copyDirectory, npmInstall, removeDirectory } from '../../../utils';
import { writeFileSync, readFileSync } from 'fs';
import { createApplicationAccess } from '@sap-ux/project-access';
import { getManifest } from '../../../../../src/page-editor-api/project';

const TIME_OUT = 5 * 60 * 1000; // 5 min due to npm install.

jest.setTimeout(TIME_OUT);

jest.mock('@sap-ux/project-access', () => {
    const actual = jest.requireActual('@sap-ux/project-access');
    return {
        ...actual,
        createApplicationAccess: jest.fn()
    };
});

const originProjectRoot = join(__dirname, '..', '..', '..', '..', 'test-data', 'ai-created-cap');
const copyProjectRoot = `${originProjectRoot}-add-page-copy`;
const appPath = join(copyProjectRoot, 'app', 'managetravels');

let importProjectMock = jest.fn();
const memFsDumpMock = jest.fn();
const commitMock = jest.fn();
const exportConfigMock = jest.fn();
beforeEach(() => {
    // memFsDumpMock.mockReturnValue({
    //     'manifest.json': {}
    // });
    // importProjectMock = jest.fn().mockResolvedValue([]);
    // // get actual createProjectProvider from the module
    // const actualCreateApplicationAccess = jest.requireActual('@sap-ux/project-access').createApplicationAccess;

    // // Setup the mock implementation
    // (createApplicationAccess as jest.Mock).mockImplementation(async (...args: any[]) => {
    //     // Create the real project provider
    //     const realApplicationAccess = await actualCreateApplicationAccess(...args);
    //     const manifest = await getManifest(realApplicationAccess);
    //     // Mock only the getSpecification method
    //     const mockSpecification = {
    //         importProject: importProjectMock,
    //         exportConfig: exportConfigMock.mockReturnValue({ manifest }),
    //         generateCustomExtension: jest.fn().mockResolvedValue({
    //             commit: commitMock,
    //             dump: memFsDumpMock
    //         })
    //     };

    //     jest.spyOn(realApplicationAccess, 'getSpecification').mockResolvedValue(mockSpecification);

    //     return realApplicationAccess;
    // });
    removeDirectory(copyProjectRoot);
    copyDirectory(originProjectRoot, copyProjectRoot);
    npmInstall(copyProjectRoot);
});

afterEach(() => jest.clearAllMocks());

describe('add-page', () => {
    describe('getFunctionalityDetails', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await addPageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.id
            });
            expect(result.name).toBe('Invalid Project Root or Application Path');
            expect(result.description).toContain(
                `To add a new page, provide a valid project root or application path. "${appPath}" is not valid`
            );
            expect(result.parameters).toHaveLength(0);
            expect(commitMock).not.toHaveBeenCalled();
        });
        test('case 2: empty page', async () => {
            const manifestSrcPath = join(__dirname, 'test-data', 'empty-page-manifest.json');
            const manifestDestPath = join(copyProjectRoot, 'app', 'managetravels', 'webapp', 'manifest.json');
            const manifestData = JSON.parse(readFileSync(manifestSrcPath, 'utf8'));
            writeFileSync(manifestDestPath, JSON.stringify(manifestData, null, 4));
            const fileContent = readFileSync(join(__dirname, 'test-data', 'empty-page-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await addPageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.id
            });
            expect(result).toMatchSnapshot();
        });
        test('case 3: one or more pages', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await addPageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.id
            });
            expect(result).toMatchSnapshot();
        });
    });
    describe('executeFunctionality', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await addPageHandlers.executeFunctionality({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.id,
                parameters: {
                    pageType: 'ListReport'
                }
            });
            expect(result.status).toBe('Failed');
            expect(result.message).toContain(`Project root not found for app path: ${appPath}`);
            expect(result.appPath).toBe(appPath);
            expect(result.changes).toHaveLength(0);
            expect(result.timestamp).toBeDefined();
            expect(commitMock).not.toHaveBeenCalledTimes(1);
        });
        test('case 2: empty page', async () => {
            const manifestSrcPath = join(__dirname, 'test-data', 'empty-page-manifest.json');
            const manifestDestPath = join(copyProjectRoot, 'app', 'managetravels', 'webapp', 'manifest.json');
            const manifestData = JSON.parse(readFileSync(manifestSrcPath, 'utf8'));
            writeFileSync(manifestDestPath, JSON.stringify(manifestData, null, 4));
            const fileContent = readFileSync(join(__dirname, 'test-data', 'empty-page-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await addPageHandlers.executeFunctionality({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.id,
                parameters: {
                    entitySet: 'Travels',
                    pageType: 'ListReport'
                }
            });

            expect(result.appPath).toBe(appPath);
            expect(result.message).toEqual(
                `Page with id 'TravelsList' of type 'ListReport' was created successfully in application '${join(
                    'app',
                    'managetravels'
                )}'`
            );
            expect(result.status).toBe('success');
            expect(result.changes).toHaveLength(1);
            expect(result.changes[0]).toContain('manifest.json');
            expect(commitMock).toHaveBeenCalledTimes(1);
            expect(memFsDumpMock).toHaveBeenCalledTimes(1);
        });
        test('case 3: one or more pages', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await addPageHandlers.executeFunctionality({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.id,
                parameters: {
                    parentPage: 'TravelsObjectPage',
                    pageNavigation: 'Expenses',
                    pageType: 'ObjectPage'
                }
            });
            expect(result.appPath).toBe(appPath);
            expect(result.message).toEqual(
                `Page with id 'Travels_ExpensesObjectPage' of type 'ObjectPage' was created successfully in application '${join(
                    'app',
                    'managetravels'
                )}'`
            );
            expect(result.status).toBe('success');
            expect(result.changes).toHaveLength(1);
            expect(result.changes[0]).toContain('manifest.json');
            expect(commitMock).toHaveBeenCalledTimes(1);
            expect(memFsDumpMock).toHaveBeenCalledTimes(1);
        });

        test('case 4: Missing pageType', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            await expect(
                addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.id,
                    parameters: {}
                })
            ).rejects.toThrow('Missing or invalid parameter "pageType"');
        });

        test('case 5: Invalid pageType', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            await expect(
                addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.id,
                    parameters: {
                        pageType: 'Dummy'
                    }
                })
            ).rejects.toThrow('Missing or invalid parameter "pageType"');
        });
    });
});

describe('delete-page', () => {
    describe('getFunctionalityDetails', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await deletePageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.id
            });
            expect(result.name).toBe('Invalid Project Root or Application Path');
            expect(result.description).toContain(
                `To delete a page, provide a valid project root or application path. "${appPath}" is not valid`
            );
            expect(result.parameters).toHaveLength(0);
            expect(commitMock).not.toHaveBeenCalled();
        });
        test('case 2: zero or more pages', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await deletePageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.id
            });
            expect(result).toMatchSnapshot();
        });
    });
    describe('executeFunctionality', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await deletePageHandlers.executeFunctionality({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.id,
                parameters: {
                    pageId: 'dummy'
                }
            });
            expect(result.status).toBe('Failed');
            expect(result.message).toContain(`Project root not found for app path: ${appPath}`);
            expect(result.appPath).toBe(appPath);
            expect(result.changes).toHaveLength(0);
            expect(result.timestamp).toBeDefined();
            expect(commitMock).not.toHaveBeenCalledTimes(1);
        });
        test('case 2: empty page', async () => {
            const manifestSrcPath = join(__dirname, 'test-data', 'empty-page-manifest.json');
            const manifestDestPath = join(copyProjectRoot, 'app', 'managetravels', 'webapp', 'manifest.json');
            const manifestData = JSON.parse(readFileSync(manifestSrcPath, 'utf8'));
            writeFileSync(manifestDestPath, JSON.stringify(manifestData, null, 4));
            const fileContent = readFileSync(join(__dirname, 'test-data', 'empty-page-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await deletePageHandlers.executeFunctionality({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.id,
                parameters: {
                    pageId: 'nothing'
                }
            });

            expect(result.appPath).toBe(appPath);
            expect(result.message).toEqual(
                `Page with id 'nothing' was not found in application '${join('app', 'managetravels')}'`
            );
            expect(result.status).toBe('unchanged');
        });
        test('case 3: one or more pages', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await deletePageHandlers.executeFunctionality({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.id,
                parameters: {
                    pageId: 'TravelsList'
                }
            });
            expect(result.appPath).toBe(appPath);
            expect(result.message).toEqual(
                `Page with id 'TravelsList' was deleted successfully in application '${join('app', 'managetravels')}'`
            );
            expect(result.status).toBe('success');
            expect(exportConfigMock).toHaveBeenCalledTimes(1);
        });
        test('case 4: missing page id', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            await expect(
                deletePageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: DELETE_PAGE_FUNCTIONALITY.id,
                    parameters: {}
                })
            ).rejects.toThrow('Missing or invalid parameter "pageId"');
        });
        test('case 5: invalid page id', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            await expect(
                deletePageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: DELETE_PAGE_FUNCTIONALITY.id,
                    parameters: {
                        pageId: {}
                    }
                })
            ).rejects.toThrow('Missing or invalid parameter "pageId"');
        });
    });
});
