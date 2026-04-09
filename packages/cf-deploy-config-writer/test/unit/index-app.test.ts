import { jest } from '@jest/globals';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const __dirname = join(fileURLToPath(import.meta.url), '..');
import type { Editor } from 'mem-fs-editor';
import fs from 'node:fs';

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

const btp = await import('@sap-ux/btp-utils');
const hasbin = await import('hasbin');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');
const { generateAppConfig, DefaultMTADestination } = await import('../../src');
const { generateSupportingConfig } = await import('../../src/utils');
const { Mta } = await import('@sap/mta-lib');
const { CommandRunner } = await import('@sap-ux/nodejs-utils');

type CFConfig = import('../../src/types').CFConfig;

let hasSyncMock: jest.Mock;
let isAppStudioMock: jest.Mock;
let listDestinationsMock: jest.Mock;
let commandRunnerMock: ReturnType<typeof jest.spyOn>;

describe('CF Writer App', () => {
    const destinationsMock = {
        'TestDestination': {
            Name: 'TestDestination',
            Type: 'MockType',
            Authentication: 'NoAuthentication',
            ProxyType: 'NoProxy',
            Description: 'MockDestination',
            Host: 'MockHost',
            WebIDEAdditionalData: btp.WebIDEAdditionalData.FULL_URL,
            WebIDEUsage: btp.WebIDEUsage.ODATA_GENERIC
        }
    };
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output', 'app');

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        isAppStudioMock = (btp.isAppStudio as jest.Mock);
        listDestinationsMock = (btp.listDestinations as jest.Mock);
        hasSyncMock = (hasbin.sync as jest.Mock).mockImplementation(() => true);
        commandRunnerMock = jest.spyOn(CommandRunner.prototype, 'run').mockImplementation(() => ({ status: 0 }) as any);
    });

    beforeAll(() => {
        jest.clearAllMocks();
        fsExtra.removeSync(outputDir);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    test('Generate deployment configs - DefaultMTADestination', async () => {
        expect(DefaultMTADestination).toEqual('fiori-default-srv-api');
    });

    test('Generate deployment configs - ensure mta.save does not exit ', async () => {
        const mockWriteFileSync = jest.spyOn(Mta.prototype, 'save').mockImplementationOnce(() => {
            throw new Error();
        });
        isAppStudioMock.mockResolvedValue(true);
        listDestinationsMock.mockResolvedValue(destinationsMock);
        const appName = 'mtaexceptionapp';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, '../sample/basicapp'), appPath);
        const localFs = await generateAppConfig({ appPath }, undefined, logger);
        expect(isAppStudioMock).toHaveBeenCalledTimes(1);
        expect(listDestinationsMock).toHaveBeenCalledTimes(1);
        expect(localFs.dump(appPath)).toMatchSnapshot();
        expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    });

    test('Generate deployment configs - HTML5 App and destination read from ui5.yaml', async () => {
        isAppStudioMock.mockResolvedValue(true);
        listDestinationsMock.mockResolvedValue(destinationsMock);
        const appName = 'basicapp01';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, '../sample/basicapp'), appPath);
        const localFs = await generateAppConfig({ appPath }, undefined, logger);
        expect(isAppStudioMock).toHaveBeenCalledTimes(1);
        expect(localFs.dump(appPath)).toMatchSnapshot();
        // Since mta.yaml is not in memfs, read from disk
        expect(localFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
    });

    test('Generate deployment configs - HTML5 App with managed approuter attached with no destination available', async () => {
        isAppStudioMock.mockResolvedValue(false);
        const appName = 'lrop';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/lrop`), appPath);
        const localFs = await generateAppConfig({ appPath, addManagedAppRouter: true }, undefined, logger);
        expect(listDestinationsMock).toHaveBeenCalledTimes(0);
        expect(localFs.dump(appPath)).toMatchSnapshot();
        // Since mta.yaml is not in memfs, read from disk
        expect(localFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
    });

    test('Generate deployment configs - HTML5 App with managed approuter attached to a multi target application', async () => {
        isAppStudioMock.mockResolvedValue(false);
        const appName = 'multi';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/multi`), appPath);
        const localFs = await generateAppConfig({ appPath, addManagedAppRouter: true });
        expect(listDestinationsMock).toHaveBeenCalledTimes(0);
        expect(localFs.dump(appPath)).toMatchSnapshot();
        // Since mta.yaml is not in memfs, read from disk
        expect(localFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
    });

    test('Throw an exception if the appPath is not found', async () => {
        const appName = 'validate';
        const appPath = join(outputDir, appName);
        await expect(generateAppConfig({ appPath }, undefined, logger)).rejects.toThrow();
    });

    test('Generate deployment configs - should fail if no HTML5 app found', async () => {
        const appName = 'standalone';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/standalone`), appPath);
        await expect(generateAppConfig({ appPath, addManagedAppRouter: false })).rejects.toThrow(
            /No SAPUI5 application found. Please ensure the manifest.json file contains a valid 'sap.app.id'./
        );
    });

    test('Generate deployment configs - standalone approuter cleanup', async () => {
        const rootPath = join(outputDir, 'standalonewithapp');
        const appPath = join(rootPath, 'myapp');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(rootPath);
        fsExtra.copySync(join(__dirname, `../sample/standalonewithapp`), rootPath);
        const localFs = await generateAppConfig({ appPath, addManagedAppRouter: false });
        expect(localFs.read(join(rootPath, 'mta.yaml'))).toMatchSnapshot();
        expect(localFs.read(join(rootPath, 'router', 'package.json'))).toMatchSnapshot();
        expect(localFs.read(join(rootPath, 'router', 'xs-app.json'))).toMatchSnapshot();
    });

    test('Generate deployment configs - generateSupportingConfig with mtaId passed in', async () => {
        const memFs = create(createStorage());
        const appPath = join(outputDir, 'supportingconfig');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        await generateSupportingConfig({ appPath, mtaId: 'testMtaId', mtaPath: appPath } as unknown as CFConfig, memFs);
        expect(memFs.read(join(appPath, 'package.json'))).toMatchSnapshot();
        expect(memFs.read(join(appPath, '.gitignore'))).toMatchSnapshot();
    });

    test('Generate deployment configs - generateSupportingConfig read mtaId read from file', async () => {
        const memFs = create(createStorage());
        const appPath = join(outputDir, 'supportingconfigreadmta');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, 'fixtures/mta-types/cdsmta'), appPath);
        await generateSupportingConfig(
            { appPath, mtaPath: appPath, addManagedAppRouter: true, mtaId: 'captestproject' } as unknown as CFConfig,
            memFs
        );
        expect(memFs.read(join(appPath, 'package.json'))).toMatchSnapshot();
        expect(memFs.read(join(appPath, '.gitignore'))).toMatchSnapshot();
        expect(memFs.read(join(appPath, 'xs-security.json'))).toMatchSnapshot();
    });

    test('Generate deployment configs - HTML5 app with no datasource configured', async () => {
        isAppStudioMock.mockResolvedValue(true);
        listDestinationsMock.mockResolvedValue(destinationsMock);
        const appName = 'basicappnodatasource';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, '../sample/basicappnodatasource'), appPath);
        const localFs = await generateAppConfig({ appPath, destinationName: 'test' }, undefined, logger);
        expect(localFs.dump(appPath)).toMatchSnapshot();
    });
});
