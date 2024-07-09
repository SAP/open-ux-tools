import type { CustomMiddleware } from '@sap-ux/ui5-config';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import * as abap from '../../../src/base/abap';
import * as mockFs from 'fs';
import {
    isCustomerBase,
    getVariant,
    isCFEnvironment,
    checkFileExists,
    checkDuplicateFile,
    getAdpConfig,
    getManifestDataSources
} from '../../../src/base/helper';
import { join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';

jest.mock('fs');

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockAdp = {
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    };
    describe('isCustomerBase', () => {
        test('should return correct value based on input', () => {
            expect(isCustomerBase('CUSTOMER_BASE')).toBe(true);
            expect(isCustomerBase('VENDOR')).toBe(false);
        });
    });

    describe('getVariant', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return variant', () => {
            const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
            const mockVariant = jest.requireActual('fs').readFileSync(mockPath, 'utf-8');
            jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => mockVariant);

            expect(getVariant(basePath)).toStrictEqual(JSON.parse(mockVariant));
        });
    });

    describe('isCFEnvironment', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return false when config.json does not exist', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

            expect(isCFEnvironment(basePath)).toBe(false);
        });

        test('should return false when environment is not CF', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
            jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => '{ "environment": "TST" }');

            expect(isCFEnvironment(basePath)).toBe(false);
        });

        test('should return true when config.json exists and environment is CF', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
            jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => '{ "environment": "CF" }');

            expect(isCFEnvironment(basePath)).toBe(true);
        });
    });
    describe('checkFileExists', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return false when file does not exist', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

            expect(checkFileExists(basePath)).toBe(false);
        });

        test('should return true when file exists', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);

            expect(checkFileExists(basePath)).toBe(true);
        });
    });

    describe('checkDuplicateFile', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return false when file is not duplicate', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
            jest.spyOn(mockFs, 'readdirSync').mockImplementationOnce(() => {
                return [] as any;
            });

            expect(checkDuplicateFile(join(basePath, 'test.file'), '/test/check/directory')).toBe(false);
        });

        test('should return false when file does not exist', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

            expect(checkDuplicateFile(join(basePath, 'test.file'), '/test/check/directory')).toBe(false);
        });

        test('should return true when file is duplicate', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
            jest.spyOn(mockFs, 'readdirSync').mockImplementationOnce(() => {
                return ['test.file'] as any;
            });

            expect(checkDuplicateFile(join(basePath, 'test.file'), '/test/check/directory')).toBe(true);
        });
    });

    describe('getAdpConfig', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should throw error when no system configuration found', async () => {
            jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue(undefined)
            } as Partial<UI5Config> as UI5Config);

            await expect(getAdpConfig(basePath, '/path/to/mock/ui5.yaml')).rejects.toThrow(
                'No system configuration found in ui5.yaml'
            );
        });

        test('should return adp configuration', async () => {
            jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue({
                    configuration: {
                        adp: mockAdp
                    }
                } as Partial<CustomMiddleware> as CustomMiddleware<object>)
            } as Partial<UI5Config> as UI5Config);

            expect(await getAdpConfig(basePath, 'ui5.yaml')).toStrictEqual(mockAdp);
        });
    });

    describe('getManifestDataSources', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should fail when no data sources are found in application manifest', async () => {
            const loggerMock = {
                debug: jest.fn(),
                error: jest.fn()
            } as Partial<ToolsLogger> as ToolsLogger;
            jest.spyOn(abap, 'getManifest').mockResolvedValueOnce({ 'sap.app': {} } as unknown as Manifest);

            await expect(getManifestDataSources('testReference', mockAdp, loggerMock)).rejects.toThrow(
                'No data sources found in the manifest'
            );
        });

        test('should return data sources from application manifest', async () => {
            const loggerMock = {
                debug: jest.fn(),
                error: jest.fn()
            } as Partial<ToolsLogger> as ToolsLogger;
            const mockManifest = jest
                .requireActual('fs')
                .readFileSync(join(basePath, '../base-app', 'manifest.json'), 'utf-8');
            jest.spyOn(abap, 'getManifest').mockResolvedValueOnce(JSON.parse(mockManifest));

            expect(await getManifestDataSources('testReference', mockAdp, loggerMock)).toStrictEqual({
                'SEPMRA_PROD_MAN_ANNO_MDL': {
                    'settings': { 'localUri': 'localService/SEPMRA_PROD_MAN_ANNO_MDL.xml' },
                    'type': 'ODataAnnotation',
                    'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN_ANNO_MDL',Version='0001')/$value/?sap-language=EN"
                },
                'mainService': {
                    'settings': {
                        'annotations': ['SEPMRA_PROD_MAN_ANNO_MDL'],
                        'localUri': 'localService/mockdata/metadata.xml'
                    },
                    'type': 'OData',
                    'uri': '/sap/opu/odata/sap/SEPMRA_PROD_MAN/'
                }
            });
        });
    });
});
