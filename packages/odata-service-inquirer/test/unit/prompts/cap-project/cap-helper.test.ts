import * as sapuxProjectAccess from '@sap-ux/project-access';
import path, { join, sep } from 'node:path';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import {
    getCapEdmx,
    getCapProjectChoices,
    getCapServiceChoices
} from '../../../../src/prompts/datasources/cap-project/cap-helpers';
import LoggerHelper from '../../../../src/prompts/logger-helper';
import { errorHandler } from '../../../../src/prompts/prompt-helpers';
import type { CapProjectPaths } from '../../../../src/prompts/datasources/cap-project/types';
import os from 'node:os';
import { ERROR_TYPE } from '@sap-ux/inquirer-common';
import type { PathLike } from 'node:fs';
import * as fsPromises from 'node:fs/promises';

const initMockCapModelAndServices = {
    model: {},
    services: {}
};

const mockCapModelAndServices1 = (drive = '', pathSep = sep) => ({
    model: {
        definitions: {
            AdminService: {
                $location: {
                    file: `..${pathSep}..${pathSep}..${pathSep}mock${pathSep}bookshop${pathSep}srv${pathSep}admin-service.cds`
                },
                kind: 'service',
                name: 'AdminService'
            },
            CatalogService: {
                $location: {
                    file: `..${pathSep}..${pathSep}..${pathSep}mock${pathSep}bookshop${pathSep}srv${pathSep}cat-service.cds`
                },
                kind: 'service',
                name: 'CatalogService'
            }
        },
        $sources: [
            `${drive}${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop${pathSep}srv${pathSep}cat-service.cds`,
            `${drive}${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop${pathSep}srv${pathSep}admin-service.cds`,
            `${drive}${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop${pathSep}db${pathSep}schema.cds`
        ]
    },
    services: [
        {
            name: 'AdminService',
            urlPath: '/admin/',
            runtime: 'Node.js'
        },
        {
            name: 'CatalogService',
            urlPath: '/cat/',
            runtime: 'Node.js'
        }
    ]
});

let currentMockCapModelAndServices = initMockCapModelAndServices;

const initialMockEdmx = '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="2"/>';
let mockEdmx: string = initialMockEdmx;

jest.mock('@sap-ux/project-access', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/project-access'),
    getCapModelAndServices: jest.fn().mockImplementation(async () => {
        return currentMockCapModelAndServices;
    }),
    getCdsRoots: jest.fn().mockResolvedValue([])
}));

jest.mock('fs/promises', () => ({
    __esModule: true, // Workaround for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('fs/promises')
}));

describe('cap-helper', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        // Ensure each test is isolated, reset mocked function return values to initial states
        mockEdmx = initialMockEdmx;
        currentMockCapModelAndServices = initMockCapModelAndServices;
    });

    test('getCapProjectChoices', async () => {
        // Zero state test
        const findCapProjectsSpy = jest.spyOn(sapuxProjectAccess, 'findCapProjects').mockResolvedValue([]);
        let choices = await getCapProjectChoices(['/test/mock/']);
        expect(choices).toMatchInlineSnapshot(`
            [
              {
                "name": "Manually select CAP project folder path",
                "value": "enterCapPath",
              },
            ]
        `);

        // Multiple CAP projects found, some of which have the same folder names
        findCapProjectsSpy.mockResolvedValue(['/test/mock/1/bookshop', '/test/mock/2/bookshop', '/test/mock/flight']);
        // Mock the realpath function to return the non-existant test path as-is
        if (os.platform() === 'win32') {
            jest.spyOn(fsPromises, 'realpath').mockImplementation(async (path: PathLike) => path as string);
        }

        choices = await getCapProjectChoices(['/test/mock/']);
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

    if (os.platform() === 'win32') {
        test('getCapProjectChoices: Windows specific drive letter casing test', async () => {
            const findCapProjectsSpy = jest
                .spyOn(sapuxProjectAccess, 'findCapProjects')
                .mockResolvedValue(['c:\\test\\mock\\bookshop', 'c:\\test\\mock\\flight']);

            jest.spyOn(fsPromises, 'realpath').mockImplementation(
                async (path: PathLike) => (path as string)[0].toUpperCase() + (path as string).slice(1)
            );

            const choices = await getCapProjectChoices(['c:\\test\\mock\\']);
            expect(choices).toEqual([
                {
                    name: 'bookshop',
                    value: {
                        app: 'app/',
                        db: 'db/',
                        folderName: 'bookshop',
                        path: 'C:\\test\\mock\\bookshop',
                        srv: 'srv/'
                    }
                },
                {
                    name: 'flight',
                    value: {
                        app: 'app/',
                        db: 'db/',
                        folderName: 'flight',
                        path: 'C:\\test\\mock\\flight',
                        srv: 'srv/'
                    }
                },
                {
                    name: 'Manually select CAP project folder path',
                    value: 'enterCapPath'
                }
            ]);
        });
    }

    test('getCapEdmx', async () => {
        const readCapServiceMetadataEdmxSpy = jest
            .spyOn(sapuxProjectAccess, 'readCapServiceMetadataEdmx')
            .mockResolvedValue(mockEdmx);
        // Valid CAP service
        expect(
            await getCapEdmx({
                projectPath: '/some/cap/project',
                urlPath: '../some/service',
                serviceName: 'Service'
            })
        ).toMatchInlineSnapshot(`"<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="2"/>"`);

        const errorHandlerSpy = jest.spyOn(errorHandler, 'logErrorMsgs');
        const logErrorSpy = jest.spyOn(LoggerHelper.logger, 'error');

        // Ensure we get errors returned from readCapServiceMetadataEdmxSpy and log them
        readCapServiceMetadataEdmxSpy.mockRejectedValue('Cannot read metadata');
        expect(
            await getCapEdmx({
                projectPath: '/test/mock/bookshop',
                urlPath: '../srv/cat-service',
                serviceName: 'CatalogService'
            })
        ).toBe(undefined);
        // Error handler should be called with custom error message
        expect(errorHandlerSpy).toHaveBeenCalledWith(
            t('errors.cannotReadCapServiceMetadata', { serviceName: 'CatalogService' })
        );
        // Logger should be called with original error
        expect(logErrorSpy).toHaveBeenCalledWith('Cannot read metadata');

        // CAP service `urlPath` not defined
        errorHandlerSpy.mockClear();
        logErrorSpy.mockClear();
        readCapServiceMetadataEdmxSpy.mockRestore();
        expect(
            await getCapEdmx({
                projectPath: '/test/mock/bookshop',
                serviceName: 'CatalogService'
            })
        ).toBe(undefined);
        // Error handler should be called with custom error message
        expect(errorHandlerSpy).toHaveBeenCalledWith(
            t('errors.capServiceUrlPathNotDefined', { serviceName: 'CatalogService' })
        );
    });

    test('getCapServiceChoices', async () => {
        const capProjectPaths: CapProjectPaths = {
            app: 'app/',
            db: 'db/',
            folderName: 'bookshop',
            path: '/test/mock/bookshop',
            srv: 'srv/'
        };
        expect(await getCapServiceChoices(capProjectPaths)).toEqual([]);

        currentMockCapModelAndServices = mockCapModelAndServices1();

        expect(await getCapServiceChoices(capProjectPaths)).toEqual([
            {
                name: 'AdminService (Node.js)',
                value: {
                    'appPath': 'app/',
                    'capType': 'Node.js',
                    'projectPath': '/test/mock/bookshop',
                    'serviceCdsPath': join('../../../some/abs/path/mock/bookshop/srv/admin-service'),
                    'serviceName': 'AdminService',
                    'urlPath': '/admin/'
                }
            },
            {
                name: 'CatalogService (Node.js)',
                value: {
                    'appPath': 'app/',
                    'capType': 'Node.js',
                    'projectPath': '/test/mock/bookshop',
                    'serviceCdsPath': join('../../../some/abs/path/mock/bookshop/srv/cat-service'),
                    'serviceName': 'CatalogService',
                    'urlPath': '/cat/'
                }
            }
        ]);
    });

    test('getCapServiceChoices: getCapModelAndServices errors are caught, handled and logged correctly', async () => {
        const errorHandlerSpy = jest.spyOn(errorHandler, 'logErrorMsgs');
        const logErrorSpy = jest.spyOn(LoggerHelper.logger, 'error');
        jest.spyOn(sapuxProjectAccess, 'getCapModelAndServices').mockRejectedValueOnce(
            new Error('getCapModelAndServices error')
        );
        const capProjectPaths: CapProjectPaths = {
            app: 'app/',
            db: 'db/',
            folderName: 'bookshop',
            path: `/some/abs/path/mock/bookshop`,
            srv: 'srv/'
        };

        expect(await getCapServiceChoices(capProjectPaths)).toEqual([]);
        expect(errorHandlerSpy).toHaveBeenCalledWith(
            ERROR_TYPE.UNKNOWN,
            t('errors.capModelAndServicesLoadError', { error: 'getCapModelAndServices error' })
        );
        expect(logErrorSpy).toHaveBeenCalledWith(
            t('errors.capModelAndServicesLoadError', { error: 'getCapModelAndServices error' })
        );
    });

    test('getCapProjectChoices: auto-detection when no projects found in search paths', async () => {
        const findCapProjectsSpy = jest.spyOn(sapuxProjectAccess, 'findCapProjects').mockResolvedValue([]);
        const findCapProjectRootSpy = jest
            .spyOn(sapuxProjectAccess, 'findCapProjectRoot')
            .mockResolvedValue('/auto/detected/project');
        const isCapProjectSpy = jest.spyOn(sapuxProjectAccess, 'isCapProject').mockResolvedValue(true);

        if (os.platform() === 'win32') {
            jest.spyOn(fsPromises, 'realpath').mockImplementation(async (path: PathLike) => path as string);
        }

        const choices = await getCapProjectChoices(['/empty/search/path']);

        expect(choices).toEqual([
            {
                name: 'project (auto-detected)',
                value: {
                    app: 'app/',
                    db: 'db/',
                    folderName: 'project',
                    path: '/auto/detected/project',
                    srv: 'srv/'
                }
            },
            {
                name: 'Manually select CAP project folder path',
                value: 'enterCapPath'
            }
        ]);

        expect(findCapProjectRootSpy).toHaveBeenCalled();
        expect(isCapProjectSpy).toHaveBeenCalledWith('/auto/detected/project');
    });

    test('getCapProjectChoices: auto-detection finds multiple projects with duplicate names', async () => {
        let callCount = 0;
        const findCapProjectsSpy = jest.spyOn(sapuxProjectAccess, 'findCapProjects').mockResolvedValue([]);
        const findCapProjectRootSpy = jest
            .spyOn(sapuxProjectAccess, 'findCapProjectRoot')
            .mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return '/project1/bookshop';
                }
                if (callCount === 2) {
                    return '/project2/bookshop';
                }
                return null;
            });
        const isCapProjectSpy = jest.spyOn(sapuxProjectAccess, 'isCapProject').mockResolvedValue(true);

        if (os.platform() === 'win32') {
            jest.spyOn(fsPromises, 'realpath').mockImplementation(async (path: PathLike) => path as string);
        }

        const choices = await getCapProjectChoices(['/path1', '/path2']);

        expect(choices).toEqual([
            {
                name: 'bookshop (auto-detected) (/project1/bookshop)',
                value: {
                    app: 'app/',
                    db: 'db/',
                    folderName: 'bookshop',
                    path: '/project1/bookshop',
                    srv: 'srv/'
                }
            },
            {
                name: 'bookshop (auto-detected) (/project2/bookshop)',
                value: {
                    app: 'app/',
                    db: 'db/',
                    folderName: 'bookshop',
                    path: '/project2/bookshop',
                    srv: 'srv/'
                }
            },
            {
                name: 'Manually select CAP project folder path',
                value: 'enterCapPath'
            }
        ]);
    });

    test('getCapProjectChoices: no auto-detection when projects are found in search paths', async () => {
        // Clear all previous spy calls before this test
        jest.clearAllMocks();

        const findCapProjectsSpy = jest
            .spyOn(sapuxProjectAccess, 'findCapProjects')
            .mockResolvedValue(['/found/project']);
        const findCapProjectRootSpy = jest.spyOn(sapuxProjectAccess, 'findCapProjectRoot');

        if (os.platform() === 'win32') {
            jest.spyOn(fsPromises, 'realpath').mockImplementation(async (path: PathLike) => path as string);
        }

        await getCapProjectChoices(['/search/path']);

        // Auto-detection should not be triggered when projects are found
        expect(findCapProjectRootSpy).not.toHaveBeenCalled();
    });

    test('getCapServiceChoices: enhanced path resolution with relative service paths', async () => {
        // Test the enhanced path resolution in createCapServiceChoice
        currentMockCapModelAndServices = {
            model: {
                definitions: {
                    TestService: {
                        $location: {
                            file: '../srv/test-service.cds'
                        },
                        kind: 'service',
                        name: 'TestService'
                    }
                },
                $sources: ['/project/root/srv/test-service.cds']
            },
            services: [
                {
                    name: 'TestService',
                    urlPath: '/test/',
                    runtime: 'Node.js'
                }
            ]
        };

        const capProjectPaths: CapProjectPaths = {
            app: 'app/',
            db: 'db/',
            folderName: 'testproject',
            path: '/project/root',
            srv: 'srv/'
        };

        const choices = await getCapServiceChoices(capProjectPaths);

        expect(choices).toEqual([
            {
                name: 'TestService (Node.js)',
                value: {
                    appPath: 'app/',
                    capType: 'Node.js',
                    cdsVersionInfo: undefined,
                    projectPath: '/project/root',
                    serviceCdsPath: 'srv/test-service',
                    serviceName: 'TestService',
                    urlPath: '/test/'
                }
            }
        ]);
    });

    /**
     * Tests the service path resolution using both Windows and Unix implementations, so this critical functionality can be easily tested on non-Windows platforms by developers.
     */
    test.each(['currentOS', 'mockWin'])(
        'getCapServiceChoice: cds service paths are resolved using OS path separators - %s',
        async (mockOS) => {
            let pathSep = sep;
            let drive = '';

            if (os.platform() === 'win32' && mockOS === 'mockWin') {
                console.log('Skipping Windows emulation test on Windows');
                return;
            }
            // Use the Windows implementations to test Windows path separators on Unix (does not run on Windows)
            if (mockOS === 'mockWin') {
                pathSep = '\\'; // Windows path separator is escaped
                drive = 'C:';
                jest.spyOn(path, 'isAbsolute').mockImplementation(path.win32.isAbsolute);
                jest.spyOn(path, 'relative').mockImplementation(path.win32.relative);
            }
            currentMockCapModelAndServices = mockCapModelAndServices1(drive, pathSep);

            jest.spyOn(sapuxProjectAccess, 'getCapCustomPaths').mockResolvedValue({
                app: 'app/',
                db: 'db/',
                srv: 'srv/'
            } as {
                app: string;
                db: string;
                srv: string;
            });

            const capProjectPaths: CapProjectPaths = {
                app: 'app/',
                db: 'db/',
                folderName: 'bookshop',
                path: `${drive}${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop`,
                srv: 'srv/'
            };

            const capServiceChoices = await getCapServiceChoices(capProjectPaths);
            expect(capServiceChoices).toBeInstanceOf(Array);
            expect(capServiceChoices.length).toBe(2);
            expect(capServiceChoices[0].name).toBe('AdminService (Node.js)');
            expect(capServiceChoices[0].value).toEqual({
                appPath: 'app/',
                capType: 'Node.js',
                projectPath:
                    mockOS === 'mockWin'
                        ? `${drive}${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop`
                        : `${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop`,
                serviceCdsPath: `srv${pathSep}admin-service`,
                serviceName: 'AdminService',
                urlPath: '/admin/'
            });
            expect(capServiceChoices[1].value).toEqual({
                appPath: 'app/',
                capType: 'Node.js',
                projectPath:
                    mockOS === 'mockWin'
                        ? `${drive}${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop`
                        : `${pathSep}some${pathSep}abs${pathSep}path${pathSep}mock${pathSep}bookshop`,
                serviceCdsPath: `srv${pathSep}cat-service`,
                serviceName: 'CatalogService',
                urlPath: '/cat/'
            });
        }
    );
});
