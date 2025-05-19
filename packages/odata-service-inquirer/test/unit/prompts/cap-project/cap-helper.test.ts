import * as sapuxProjectAccess from '@sap-ux/project-access';
import path, { join, sep } from 'path';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import {
    getCapEdmx,
    getCapProjectChoices,
    getCapServiceChoices
} from '../../../../src/prompts/datasources/cap-project/cap-helpers';
import LoggerHelper from '../../../../src/prompts/logger-helper';
import { errorHandler } from '../../../../src/prompts/prompt-helpers';
import type { CapProjectPaths } from '../../../../src/prompts/datasources/cap-project/types';
import os from 'os';
import { ERROR_TYPE } from '@sap-ux/inquirer-common';
import fs, { PathLike } from 'fs';

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
        jest.spyOn(sapuxProjectAccess, 'getCapCustomPaths').mockResolvedValue({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
        jest.spyOn(fs.promises, 'realpath').mockImplementation(async (path) => Promise.resolve(String(path)));
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

    test('Should use realpath to convert Windows paths to correct casing - getCapProjectChoices', async () => {
        const findCapProjectsSpy = jest
            .spyOn(sapuxProjectAccess, 'findCapProjects')
            .mockResolvedValue(['C:\\test\\mock\\BOOKSHOP', 'C:\\test\\mock\\FLIGHT']);
        jest.spyOn(sapuxProjectAccess, 'getCapCustomPaths').mockResolvedValue({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
        jest.spyOn(fs.promises, 'realpath').mockImplementation(async (path: PathLike) => {
            // Simulate realpath converting paths to correct casing
            if (path === 'c:\\test\\mock\\BOOKSHOP') {
                return 'C:\\Test\\Mock\\Bookshop';
            }
            if (path === 'c:\\test\\mock\\FLIGHT') {
                return 'C:\\Test\\Mock\\Flight';
            }
            return String(path);
        });

        const choices = await getCapProjectChoices(['C:\\test\\mock\\']);
        expect(choices).toMatchInlineSnapshot(`
            [
              {
                "name": "C:\\test\\mock\\BOOKSHOP",
                "value": {
                  "app": "app/",
                  "db": "db/",
                  "folderName": "C:\\test\\mock\\BOOKSHOP",
                  "path": "C:\\test\\mock\\BOOKSHOP",
                  "srv": "srv/",
                },
              },
              {
                "name": "C:\\test\\mock\\FLIGHT",
                "value": {
                  "app": "app/",
                  "db": "db/",
                  "folderName": "C:\\test\\mock\\FLIGHT",
                  "path": "C:\\test\\mock\\FLIGHT",
                  "srv": "srv/",
                },
              },
              {
                "name": "Manually select CAP project folder path",
                "value": "enterCapPath",
              },
            ]
        `);

        expect(findCapProjectsSpy).toHaveBeenCalledWith({ wsFolders: ['C:\\test\\mock\\'] });
    });
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

    test('getCapProjectChoices calls mocked realpath to normalize drive letter casing on Windows', async () => {
        const isWindows = os.platform() === 'win32';
        const findCapProjectsSpy = jest
            .spyOn(sapuxProjectAccess, 'findCapProjects')
            .mockResolvedValue(['C:\\test\\mock\\BOOKSHOP', 'C:\\test\\mock\\FLIGHT']);
        jest.spyOn(sapuxProjectAccess, 'getCapCustomPaths').mockResolvedValue({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
    
        const realpathSpy = jest.spyOn(fs.promises, 'realpath').mockImplementation(async (path: PathLike) => {
            if (path === 'c:\\test\\mock\\BOOKSHOP') {
                return 'C:\\Test\\Mock\\Bookshop';
            }
            if (path === 'c:\\test\\mock\\FLIGHT') {
                return 'C:\\Test\\Mock\\Flight';
            }
            return String(path);
        });
    
        const choices = await getCapProjectChoices(['C:\\test\\mock\\']);
    
        if (isWindows) {
            expect(realpathSpy).toHaveBeenCalledTimes(2);
            expect(choices).toEqual([
                {
                    name: 'Bookshop (C:\\Test\\Mock\\Bookshop)',
                    value: {
                        app: 'app/',
                        db: 'db/',
                        folderName: 'Bookshop',
                        path: 'C:\\Test\\Mock\\Bookshop',
                        srv: 'srv/'
                    }
                },
                {
                    name: 'Flight (C:\\Test\\Mock\\Flight)',
                    value: {
                        app: 'app/',
                        db: 'db/',
                        folderName: 'Flight',
                        path: 'C:\\Test\\Mock\\Flight',
                        srv: 'srv/'
                    }
                },
                {
                    name: 'Manually select CAP project folder path',
                    value: 'enterCapPath'
                }
            ]);
        } else {
            expect(realpathSpy).not.toHaveBeenCalled();
        }
    
        findCapProjectsSpy.mockRestore();
        realpathSpy.mockRestore();
    });
});
