import { join } from 'path';
import fsExtra from 'fs-extra';
import * as hasbin from 'hasbin';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { apiGetInstanceCredentials } from '@sap/cf-tools';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { type CFBaseConfig, generateBaseConfig } from '../../src';
import { RouterModuleType } from '../../src/types';
import { MTABinNotFound } from '../../src/constants';
import type { Editor } from 'mem-fs-editor';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

jest.mock('hasbin', () => {
    return {
        ...(jest.requireActual('hasbin') as {}),
        sync: jest.fn()
    };
});

jest.mock('@sap/cf-tools');

let hasSyncMock: jest.SpyInstance;

describe('CF Writer', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output', 'base');
    let unitTestFs: Editor;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        unitTestFs = create(createStorage());
        hasSyncMock = jest.spyOn(hasbin, 'sync').mockImplementation(() => true);
    });

    beforeAll(() => {
        jest.clearAllMocks();
        fsExtra.removeSync(outputDir);
        jest.mock('hasbin', () => {
            return {
                ...(jest.requireActual('hasbin') as {}),
                sync: hasSyncMock
            };
        });
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    describe('Generate Base Config - Standalone', () => {
        test('Generate deployment configs - standalone with connectivity service', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'standalonewithconnectivityservice';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true
                },
                unitTestFs,
                logger
            );
            expect(debugSpy).toBeCalledTimes(1);
            expect(unitTestFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });

        test('Generate deployment configs - standalone with ABAP service provider', async () => {
            const apiGetInstanceCredentialsMock = apiGetInstanceCredentials as jest.Mock;
            apiGetInstanceCredentialsMock.mockResolvedValue({
                credentials: {
                    endpoints: { TestEndPoint: '' },
                    'sap.cloud.service': 'TestService'
                }
            });
            const mtaId = 'standalonewithabapserviceprovider';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Standard,
                    abapServiceProvider: {
                        abapService: 'abap-haas',
                        abapServiceName: 'Y11_00.0035'
                    }
                },
                unitTestFs,
                logger
            );
            expect(unitTestFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });

    describe('Generate Base Config - Managed', () => {
        test('Generate deployment configs - managed', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'managed';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    mtaDescription: 'MyManagedDescription',
                    routerType: RouterModuleType.Managed
                },
                unitTestFs,
                logger
            );
            expect(debugSpy).toBeCalledTimes(1);
            expect(unitTestFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });

    describe('Generate Base Config - Validation', () => {
        test('Generate invalid deployment configs', async () => {
            const mtaId = 'invalidconfigs02';
            const mtaPath = join(outputDir, mtaId);
            const config = {
                abapServiceProvider: {
                    abapService: '~abapService',
                    abapServiceName: '~abapService'
                },
                mtaPath,
                mtaId,
                mtaDescription: 'MyManagedDescription',
                routerType: RouterModuleType.Managed
            } as Partial<CFBaseConfig>;
            jest.spyOn(unitTestFs, 'exists').mockReturnValueOnce(true);
            await expect(generateBaseConfig(config as CFBaseConfig, unitTestFs)).rejects.toThrowError(
                'A folder with same name already exists in the target directory'
            );
            delete config.abapServiceProvider?.abapService;
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrowError(
                'Missing ABAP service details for direct service binding'
            );
            await expect(generateBaseConfig({ ...config, mtaId: '~sample' } as CFBaseConfig)).rejects.toThrowError(
                'The MTA ID can only contain letters, numbers, dashes, periods and underscores (but no spaces)'
            );
            delete config.routerType;
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrowError(
                'Missing required parameters, MTA path, MTA ID or router type'
            );
            hasSyncMock.mockReturnValue(false);
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrowError(MTABinNotFound);
        });
    });
});
