import { jest } from '@jest/globals';
import { join, sep } from 'node:path';
import os from 'node:os';
import type { PathLike } from 'node:fs';
import type { CapProjectPaths } from '../../../../src/prompts/datasources/cap-project/types';

// Mock node:path with controllable isAbsolute and relative functions
// We need to get the actual path module first via dynamic import to use win32 variants
const pathModule = await import('node:path');
const mockIsAbsolute = jest.fn<typeof pathModule.isAbsolute>(pathModule.isAbsolute);
const mockRelative = jest.fn<typeof pathModule.relative>(pathModule.relative);
jest.unstable_mockModule('node:path', () => ({
    ...pathModule,
    default: {
        ...pathModule.default,
        isAbsolute: mockIsAbsolute,
        relative: mockRelative
    },
    isAbsolute: mockIsAbsolute,
    relative: mockRelative
}));

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

// Controllable mocks for @sap-ux/project-access
const mockFindCapProjects = jest.fn<any>().mockResolvedValue([]);
const mockGetCapModelAndServices = jest.fn<any>().mockImplementation(async () => currentMockCapModelAndServices);
const mockGetCdsRoots = jest.fn<any>().mockResolvedValue([]);
const mockReadCapServiceMetadataEdmx = jest.fn<any>().mockImplementation(async () => mockEdmx);
const mockGetCapCustomPaths = jest.fn<any>().mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' });

const actualProjectAccess = await import('@sap-ux/project-access');
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    findCapProjects: mockFindCapProjects,
    getCapModelAndServices: mockGetCapModelAndServices,
    getCdsRoots: mockGetCdsRoots,
    readCapServiceMetadataEdmx: mockReadCapServiceMetadataEdmx,
    getCapCustomPaths: mockGetCapCustomPaths
}));

// Mock fs/promises with controllable realpath
const actualFsPromises = await import('node:fs/promises');
const mockRealpath = jest.fn<any>();
jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFsPromises,
    realpath: mockRealpath
}));
// Also mock 'fs/promises' (same module, different specifier)
jest.unstable_mockModule('fs/promises', () => ({
    ...actualFsPromises,
    realpath: mockRealpath
}));

const mockGetHostEnvironment = jest.fn<any>();
const actualFioriGeneratorShared = await import('@sap-ux/fiori-generator-shared');
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGeneratorShared,
    getHostEnvironment: mockGetHostEnvironment
}));

// Dynamic imports after all mocks
const { initI18nOdataServiceInquirer, t } = await import('../../../../src/i18n');
const {
    getCapEdmx,
    getCapProjectChoices,
    getCapServiceChoices
} = await import('../../../../src/prompts/datasources/cap-project/cap-helpers');
const LoggerHelper = (await import('../../../../src/prompts/logger-helper')).default;
const { errorHandler } = await import('../../../../src/prompts/prompt-helpers');
const { ERROR_TYPE } = await import('@sap-ux/inquirer-common');
const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');

describe('cap-helper', () => {
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        // Ensure each test is isolated, reset mocked function return values to initial states
        mockEdmx = initialMockEdmx;
        currentMockCapModelAndServices = initMockCapModelAndServices;
        jest.clearAllMocks();
        // Reset default implementations
        mockFindCapProjects.mockResolvedValue([]);
        mockGetCapModelAndServices.mockImplementation(async () => currentMockCapModelAndServices);
        mockReadCapServiceMetadataEdmx.mockImplementation(async () => mockEdmx);
        mockGetCapCustomPaths.mockResolvedValue({ app: 'app/', db: 'db/', srv: 'srv/' });
        // Reset path mocks to real implementations
        mockIsAbsolute.mockImplementation(pathModule.isAbsolute);
        mockRelative.mockImplementation(pathModule.relative);
    });

    test('getCapProjectChoices', async () => {
        // Zero state test
        mockFindCapProjects.mockResolvedValue([]);
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
        mockFindCapProjects.mockResolvedValue(['/test/mock/1/bookshop', '/test/mock/2/bookshop', '/test/mock/flight']);
        // Mock the realpath function to return the non-existant test path as-is
        if (os.platform() === 'win32') {
            mockRealpath.mockImplementation(async (path: PathLike) => path as string);
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
        expect(mockFindCapProjects).toHaveBeenCalledWith({ 'wsFolders': ['/test/mock/'] });
    });
    test('getCapProjectChoices: Searches parent directories in CLI when no projects found', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);

        // First call returns empty, second call returns project from parent
        mockFindCapProjects.mockResolvedValueOnce([]).mockResolvedValueOnce(['/parent/cap-project']);

        const choices = await getCapProjectChoices(['/parent/cap-project/app/my-app']);

        // Verify parent search was called with noTraversal flag
        expect(mockFindCapProjects).toHaveBeenCalledTimes(2);
        expect(mockFindCapProjects).toHaveBeenNthCalledWith(2, {
            wsFolders: expect.any(Array),
            noTraversal: true
        });
        expect(choices.length).toBeGreaterThan(1);
    });

    test('getCapProjectChoices: Does not search parent directories in YUI environment', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        mockFindCapProjects.mockResolvedValueOnce([]);

        await getCapProjectChoices(['/some/path']);

        // Should only be called once (no parent search)
        expect(mockFindCapProjects).toHaveBeenCalledTimes(1);
    });

    if (os.platform() === 'win32') {
        test('getCapProjectChoices: Windows specific drive letter casing test', async () => {
            mockFindCapProjects.mockResolvedValue(['c:\\test\\mock\\bookshop', 'c:\\test\\mock\\flight']);

            mockRealpath.mockImplementation(
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
        mockReadCapServiceMetadataEdmx.mockResolvedValue(mockEdmx);
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

        // Ensure we get errors returned from readCapServiceMetadataEdmx and log them
        mockReadCapServiceMetadataEdmx.mockRejectedValue('Cannot read metadata');
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
        mockReadCapServiceMetadataEdmx.mockResolvedValue(mockEdmx);
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
        mockGetCapModelAndServices.mockRejectedValueOnce(new Error('getCapModelAndServices error'));
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
                mockIsAbsolute.mockImplementation(pathModule.win32.isAbsolute);
                mockRelative.mockImplementation(pathModule.win32.relative);
            }
            currentMockCapModelAndServices = mockCapModelAndServices1(drive, pathSep);

            mockGetCapCustomPaths.mockResolvedValue({
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
