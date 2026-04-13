import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import fs from 'node:fs';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

const realHasbin = await import('hasbin');
jest.unstable_mockModule('hasbin', () => ({
    ...realHasbin,
    sync: jest.fn()
}));

const realCfTools = await import('@sap/cf-tools');
jest.unstable_mockModule('@sap/cf-tools', () => ({
    ...realCfTools,
    apiGetInstanceCredentials: jest.fn()
}));

const { MockMta } = await import('./mockMta');
jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const hasbin = await import('hasbin');
const cfTools = await import('@sap/cf-tools');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');
const { generateBaseConfig } = await import('../../src');
const { RouterModuleType } = await import('../../src/types');
const { MTABinNotFound } = await import('../../src/constants');

import type { CFBaseConfig } from '../../src/index.js';

let hasSyncMock: jest.Mock;

describe('CF Writer Base', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output', 'base');
    const unitTestFs: Editor = create(createStorage());

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        hasSyncMock = (hasbin.sync as jest.Mock).mockImplementation(() => true);
    });

    beforeAll(() => {
        jest.clearAllMocks();
        fsExtra.removeSync(outputDir);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    describe('Generate Base Config - Standalone', () => {
        test('Generate deployment configs - standalone with ABAP service provider', async () => {
            const apiGetInstanceCredentialsMock = cfTools.apiGetInstanceCredentials as jest.Mock;
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
            const localFs = await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Standard,
                    abapServiceProvider: {
                        abapService: 'abap-haas',
                        abapServiceName: 'Y11_00.0035'
                    }
                },
                undefined,
                logger
            );
            expect(localFs.dump(mtaPath)).toMatchSnapshot();
            expect(localFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });

        test('Generate deployment configs - standalone with connectivity service', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'standalone-with-connectivity-service';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            const localFs = await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true
                },
                undefined,
                logger
            );
            expect(debugSpy).toHaveBeenCalledTimes(8);
            expect(localFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(localFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });

    describe('Generate Base Config - Managed', () => {
        test('Generate deployment configs - managed', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'managed';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            const localFs = await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    mtaDescription: 'MyManagedDescription',
                    routerType: RouterModuleType.Managed
                },
                undefined,
                logger
            );
            expect(debugSpy).toHaveBeenCalledTimes(10);
            expect(localFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(localFs.read(join(mtaPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });

    describe('Generate Base Config - App Frontend', () => {
        test('Generate deployment configs - app frontend', async () => {
            const debugSpy = jest.spyOn(logger, 'debug');
            const mtaId = 'appfrontend';
            const mtaPath = join(outputDir, mtaId);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(mtaPath);
            const localFs = await generateBaseConfig(
                {
                    mtaPath,
                    mtaId,
                    mtaDescription: 'MyManagedDescription',
                    routerType: RouterModuleType.AppFront
                },
                undefined,
                logger
            );
            expect(debugSpy).toHaveBeenCalledTimes(9);
            expect(localFs.dump(mtaPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(fs.readFileSync(join(mtaPath, 'mta.yaml'), { encoding: 'utf8' })).toMatchSnapshot();
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
            await expect(generateBaseConfig(config as CFBaseConfig, unitTestFs)).rejects.toThrow(
                'An `mta.yaml` file already exists in the target directory.'
            );
            delete config.abapServiceProvider?.abapService;
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrow(
                'Missing ABAP service details for direct service binding'
            );
            delete config.routerType;
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrow(
                'Missing required parameters, MTA Path, MTA ID, or the Router type is missing.'
            );
            hasSyncMock.mockReturnValue(false);
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrow(MTABinNotFound);
        });
        it.each([['~sample'], ['111sample'], [' sample'], ['0sample'], ['.sample'], ['s'.repeat(129)]])(
            'Validate length and starting characters %s',
            async (mtaId) => {
                const config = {
                    abapServiceProvider: {
                        abapService: '~abapService',
                        abapServiceName: '~abapService'
                    },
                    mtaPath: join(outputDir, mtaId),
                    mtaId,
                    mtaDescription: 'MyManagedDescription',
                    routerType: RouterModuleType.Managed
                } as Partial<CFBaseConfig>;
                await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrow(
                    'The MTA ID must start with a letter or underscore and be less than 128 characters.'
                );
            }
        );

        it.each([['sampl!e'], ['sample two']])('Validate mtaId %s', async (mtaId) => {
            const config = {
                abapServiceProvider: {
                    abapService: '~abapService',
                    abapServiceName: '~abapService'
                },
                mtaPath: join(outputDir, mtaId),
                mtaId,
                mtaDescription: 'MyManagedDescription',
                routerType: RouterModuleType.Managed
            } as Partial<CFBaseConfig>;
            await expect(generateBaseConfig(config as CFBaseConfig)).rejects.toThrow(
                'The MTA ID can only contain letters, numbers, dashes, periods, and underscores.'
            );
        });
    });
});
