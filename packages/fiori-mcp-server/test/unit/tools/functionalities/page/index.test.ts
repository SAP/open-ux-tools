import { join } from 'node:path';
import {
    ADD_PAGE_FUNCTIONALITY,
    addPageHandlers,
    DELETE_PAGE_FUNCTIONALITY,
    deletePageHandlers
} from '../../../../../src/tools/functionalities/page';
import { copyDirectory, npmInstall, removeDirectory } from '../../../utils';
import { writeFileSync, readFileSync } from 'node:fs';
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
const generateCustomExtensionMock = jest.fn().mockResolvedValue({
    commit: commitMock,
    dump: memFsDumpMock
});
beforeEach(() => {
    memFsDumpMock.mockReturnValue({
        'manifest.json': {}
    });
    importProjectMock = jest.fn().mockResolvedValue([]);
    // get actual createProjectProvider from the module
    const actualCreateApplicationAccess = jest.requireActual('@sap-ux/project-access').createApplicationAccess;

    // Setup the mock implementation
    (createApplicationAccess as jest.Mock).mockImplementation(async (...args: any[]) => {
        // Create the real project provider
        const realApplicationAccess = await actualCreateApplicationAccess(...args);
        const manifest = await getManifest(realApplicationAccess);
        // Mock only the getSpecification method
        const mockSpecification = {
            importProject: importProjectMock,
            exportConfig: exportConfigMock.mockReturnValue({ manifest }),
            generateCustomExtension: generateCustomExtensionMock
        };

        jest.spyOn(realApplicationAccess, 'getSpecification').mockResolvedValue(mockSpecification);

        return realApplicationAccess;
    });
    removeDirectory(copyProjectRoot);
    copyDirectory(originProjectRoot, copyProjectRoot);
    npmInstall(copyProjectRoot);
});

afterEach(() => jest.clearAllMocks());

const getMockAppJsonV2 = (fileName = 'two-pages-spec-app.json') => {
    const fileContent = readFileSync(join(__dirname, 'test-data', fileName), 'utf8');
    // Mock as v2 application
    const appJson = JSON.parse(fileContent);
    appJson.target.fioriElements = appJson.target.odata = 'v2';
    return appJson;
};

describe('add-page', () => {
    describe('getFunctionalityDetails', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await addPageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId
            });
            expect(result.name).toBe('Invalid Project Root or Application Path');
            expect(result.description).toContain(
                `To add a new page, provide a valid project root or application path. "${appPath}" is not valid`
            );
            expect(result.parameters).toEqual({});
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
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId
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
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId
            });
            expect(result).toMatchSnapshot();
        });
        test('case 4: v2', async () => {
            const appJson = getMockAppJsonV2('two-pages-spec-app.json');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent: JSON.stringify(appJson)
                }
            ]);
            const result = await addPageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId
            });
            expect(result).toMatchSnapshot();
        });
    });
    describe('executeFunctionality', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await addPageHandlers.executeFunctionality({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
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
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
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
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
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
            await expect(
                addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {}
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"ListReport\\",
                            \\"ObjectPage\\",
                            \\"CustomPage\\"
                        ],
                        \\"path\\": [
                            \\"pageType\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"ListReport\\\\\\"|\\\\\\"ObjectPage\\\\\\"|\\\\\\"CustomPage\\\\\\"\\"
                    },
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"Travels\\",
                            \\"Expenses\\",
                            \\"TravelsStatusCodeList\\",
                            \\"TravelsStatusCodeList_texts\\"
                        ],
                        \\"path\\": [
                            \\"entitySet\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"Travels\\\\\\"|\\\\\\"Expenses\\\\\\"|\\\\\\"TravelsStatusCodeList\\\\\\"|\\\\\\"TravelsStatusCodeList_texts\\\\\\"\\"
                    }
                ]"
            `);
        });

        test('case 5: Invalid pageType', async () => {
            await expect(
                addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageType: 'Dummy'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"ListReport\\",
                            \\"ObjectPage\\",
                            \\"CustomPage\\"
                        ],
                        \\"path\\": [
                            \\"pageType\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"ListReport\\\\\\"|\\\\\\"ObjectPage\\\\\\"|\\\\\\"CustomPage\\\\\\"\\"
                    },
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"Travels\\",
                            \\"Expenses\\",
                            \\"TravelsStatusCodeList\\",
                            \\"TravelsStatusCodeList_texts\\"
                        ],
                        \\"path\\": [
                            \\"entitySet\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"Travels\\\\\\"|\\\\\\"Expenses\\\\\\"|\\\\\\"TravelsStatusCodeList\\\\\\"|\\\\\\"TravelsStatusCodeList_texts\\\\\\"\\"
                    }
                ]"
            `);
        });

        test('case 6: add custom page', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            const result = await addPageHandlers.executeFunctionality({
                appPath,
                functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                parameters: {
                    parentPage: 'TravelsObjectPage',
                    pageNavigation: 'Expenses',
                    pageType: 'CustomPage',
                    pageViewName: 'Dummy'
                }
            });
            expect(result.appPath).toBe(appPath);
            expect(result.message).toEqual(
                `Page with id 'DummyPage' of type 'CustomPage' was created successfully in application '${join(
                    'app',
                    'managetravels'
                )}'`
            );
            expect(result.status).toBe('success');
            expect(result.changes).toHaveLength(1);
            expect(result.changes[0]).toContain('manifest.json');
            expect(commitMock).toHaveBeenCalledTimes(1);
            expect(memFsDumpMock).toHaveBeenCalledTimes(1);
            expect(generateCustomExtensionMock).toHaveBeenCalledTimes(1);
            expect(generateCustomExtensionMock).toHaveBeenCalledWith({
                basePath: appPath,
                'customExtension': 'CustomPage',
                'data': {
                    'contextPath': '/Travels/Expenses',
                    'entity': 'Expenses',
                    'folder': join('ext', 'view'),
                    'id': 'DummyPage',
                    'minUI5Version': '1.136.0',
                    'name': 'Dummy',
                    'navigation': {
                        'navEntity': 'Expenses',
                        'navKey': true,
                        'sourceEntity': 'Travels',
                        'sourcePage': 'TravelsObjectPage'
                    }
                }
            });
        });

        test('case 7: add custom page without "pageViewName"', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            await expect(
                addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        parentPage: 'TravelsObjectPage',
                        pageNavigation: 'Expenses',
                        pageType: 'CustomPage'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"custom\\",
                        \\"path\\": [
                            \\"pageViewName\\"
                        ],
                        \\"message\\": \\"A pageViewName must be provided when using PageTypeV4.CustomPage\\"
                    }
                ]"
            `);
        });

        test('case 8: validate incorrect "pageViewName"', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            await expect(
                addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        parentPage: 'TravelsObjectPage',
                        pageNavigation: 'Expenses',
                        pageType: 'CustomPage',
                        pageViewName: '1Dummy'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"origin\\": \\"string\\",
                        \\"code\\": \\"invalid_format\\",
                        \\"format\\": \\"regex\\",
                        \\"pattern\\": \\"/^[A-Za-z][A-Za-z0-9_-]*$/\\",
                        \\"path\\": [
                            \\"pageViewName\\"
                        ],
                        \\"message\\": \\"Invalid string: must match pattern /^[A-Za-z][A-Za-z0-9_-]*$/\\"
                    }
                ]"
            `);
        });

        describe('v2', () => {
            beforeEach(() => {
                const manifestDestPath = join(copyProjectRoot, 'app', 'managetravels', 'webapp', 'manifest.json');
                const manifestData = JSON.parse(readFileSync(manifestDestPath, 'utf8'));
                manifestData['sap.app'].dataSources.mainService.settings.odataVersion = '2.0';
                writeFileSync(manifestDestPath, JSON.stringify(manifestData, null, 4));
            });
            test('Add page', async () => {
                const appJson = getMockAppJsonV2();
                importProjectMock.mockResolvedValue([
                    {
                        dataSourceUri: 'app.json',
                        fileContent: JSON.stringify(appJson)
                    }
                ]);
                const result = await addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        parentPage: 'TravelsObjectPage',
                        pageNavigation: 'Expenses',
                        pageType: 'ObjectPage'
                    }
                });
                expect(result.appPath).toBe(appPath);
                expect(result.message).toEqual(
                    `Page with id 'ObjectPage_Expenses' of type 'ObjectPage' was created successfully in application '${join(
                        'app',
                        'managetravels'
                    )}'`
                );
                expect(result.status).toBe('success');
                expect(result.changes).toHaveLength(1);
                expect(result.changes[0]).toContain('manifest.json');
                expect(exportConfigMock).toHaveBeenCalledTimes(1);
                const updatedAppConfig = exportConfigMock.mock.calls[0];
                const pages = updatedAppConfig[0].v2.Application.application.pages;
                expect(pages['ObjectPage_Expenses']).toEqual({
                    entitySet: 'Expenses',
                    navigation: {},
                    navigationProperty: 'Expenses',
                    pageType: 'ObjectPage'
                });
                expect(pages['TravelsObjectPage']).toEqual({
                    contextPath: '/Travels',
                    entitySet: 'Travels',
                    entityType: 'manageTravelsSrv.Travels',
                    navigation: {
                        'ObjectPage_Expenses': 'Travels.Expenses'
                    },
                    pageType: 'ObjectPage',
                    routePattern: 'Travels({key}):?query:',
                    template: 'sap.fe.templates.ObjectPage'
                });
            });

            test('Add page when navigation is not set in parent', async () => {
                const appJson = getMockAppJsonV2();
                delete appJson.pages['TravelsObjectPage'].navigation;
                importProjectMock.mockResolvedValue([
                    {
                        dataSourceUri: 'app.json',
                        fileContent: JSON.stringify(appJson)
                    }
                ]);
                await addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        parentPage: 'TravelsObjectPage',
                        pageNavigation: 'Expenses',
                        pageType: 'ObjectPage'
                    }
                });
                expect(exportConfigMock).toHaveBeenCalledTimes(1);
                const updatedAppConfig = exportConfigMock.mock.calls[0];
                const pages = updatedAppConfig[0].v2.Application.application.pages;
                expect(pages['ObjectPage_Expenses']).toEqual({
                    entitySet: 'Expenses',
                    navigation: {},
                    navigationProperty: 'Expenses',
                    pageType: 'ObjectPage'
                });
                expect(pages['TravelsObjectPage']).toEqual({
                    contextPath: '/Travels',
                    entitySet: 'Travels',
                    entityType: 'manageTravelsSrv.Travels',
                    navigation: {
                        'ObjectPage_Expenses': 'Travels.Expenses'
                    },
                    pageType: 'ObjectPage',
                    routePattern: 'Travels({key}):?query:',
                    template: 'sap.fe.templates.ObjectPage'
                });
            });

            test('Add page when no any page', async () => {
                const appJson = getMockAppJsonV2();
                delete appJson.pages;
                importProjectMock.mockResolvedValue([
                    {
                        dataSourceUri: 'app.json',
                        fileContent: JSON.stringify(appJson)
                    }
                ]);
                await addPageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: ADD_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        entitySet: 'Travels',
                        pageType: 'ObjectPage'
                    }
                });
                expect(exportConfigMock).toHaveBeenCalledTimes(1);
                const updatedAppConfig = exportConfigMock.mock.calls[0];
                const pages = updatedAppConfig[0].v2.Application.application.pages;
                expect(pages).toEqual({
                    'ObjectPage_Travels': {
                        entitySet: 'Travels',
                        navigation: {},
                        navigationProperty: 'Travels',
                        pageType: 'ObjectPage'
                    }
                });
            });
        });
    });
});

describe('delete-page', () => {
    describe('getFunctionalityDetails', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await deletePageHandlers.getFunctionalityDetails({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId
            });
            expect(result.name).toBe('Invalid Project Root or Application Path');
            expect(result.description).toContain(
                `To delete a page, provide a valid project root or application path. "${appPath}" is not valid`
            );
            expect(result.parameters).toEqual({});
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
                functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId
            });
            expect(result).toMatchSnapshot();
        });
    });
    describe('executeFunctionality', () => {
        test('case 1: Invalid project root or app path', async () => {
            const appPath = join(__dirname, 'invalid', 'app', 'path');
            const result = await deletePageHandlers.executeFunctionality({
                appPath,
                functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId,
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
            await expect(
                deletePageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageId: 'nothing'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [],
                        \\"path\\": [
                            \\"pageId\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\"
                    }
                ]"
            `);
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
                functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId,
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
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            await expect(
                deletePageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {}
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"TravelsList\\",
                            \\"TravelsObjectPage\\"
                        ],
                        \\"path\\": [
                            \\"pageId\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"TravelsList\\\\\\"|\\\\\\"TravelsObjectPage\\\\\\"\\"
                    }
                ]"
            `);
        });
        test('case 5: invalid page id', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            await expect(
                deletePageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageId: {}
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"TravelsList\\",
                            \\"TravelsObjectPage\\"
                        ],
                        \\"path\\": [
                            \\"pageId\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"TravelsList\\\\\\"|\\\\\\"TravelsObjectPage\\\\\\"\\"
                    }
                ]"
            `);
        });
        test('case 5: unexisting page id', async () => {
            const fileContent = readFileSync(join(__dirname, 'test-data', 'two-pages-spec-app.json'), 'utf8');
            importProjectMock.mockResolvedValue([
                {
                    dataSourceUri: 'app.json',
                    fileContent
                }
            ]);
            await expect(
                deletePageHandlers.executeFunctionality({
                    appPath,
                    functionalityId: DELETE_PAGE_FUNCTIONALITY.functionalityId,
                    parameters: {
                        pageId: 'Dummy'
                    }
                })
            ).rejects.toThrowErrorMatchingInlineSnapshot(`
                "Missing required fields in parameters. [
                    {
                        \\"code\\": \\"invalid_value\\",
                        \\"values\\": [
                            \\"TravelsList\\",
                            \\"TravelsObjectPage\\"
                        ],
                        \\"path\\": [
                            \\"pageId\\"
                        ],
                        \\"message\\": \\"Invalid option: expected one of \\\\\\"TravelsList\\\\\\"|\\\\\\"TravelsObjectPage\\\\\\"\\"
                    }
                ]"
            `);
        });
    });
});
