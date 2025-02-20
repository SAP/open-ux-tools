import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import * as btp from '@sap-ux/btp-utils';
import { generateAppConfig, DefaultMTADestination } from '../../src';
import { generateSupportingConfig } from '../../src/utils';
import type { CFConfig } from '../../src/types';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

jest.mock('hasbin', () => ({
    ...(jest.requireActual('hasbin') as {}),
    sync: jest.fn()
}));

jest.mock('@sap/mta-lib', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Mta: require('./mockMta').MockMta
    };
});

let hasSyncMock: jest.SpyInstance;
let isAppStudioMock: jest.SpyInstance;
let listDestinationsMock: jest.SpyInstance;

describe('CF Writer App', () => {
    jest.setTimeout(10000);

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
        isAppStudioMock = jest.spyOn(btp, 'isAppStudio');
        listDestinationsMock = jest.spyOn(btp, 'listDestinations');
        hasSyncMock = jest.spyOn(hasbin, 'sync').mockImplementation(() => true);
    });

    beforeAll(() => {
        jest.clearAllMocks();
        jest.spyOn(hasbin, 'sync').mockReturnValue(true);
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

    test('Generate deployment configs - DefaultMTADestination', async () => {
        expect(DefaultMTADestination).toEqual('fiori-default-srv-api');
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
        expect(isAppStudioMock).toBeCalledTimes(1);
        expect(listDestinationsMock).toBeCalledTimes(1);
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
        expect(listDestinationsMock).toBeCalledTimes(0);
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
        expect(listDestinationsMock).toBeCalledTimes(0);
        expect(localFs.dump(appPath)).toMatchSnapshot();
        // Since mta.yaml is not in memfs, read from disk
        expect(localFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
    });

    test('Throw an exception if the appPath is not found', async () => {
        const appName = 'validate';
        const appPath = join(outputDir, appName);
        await expect(generateAppConfig({ appPath }, undefined, logger)).rejects.toThrowError();
    });

    test('Generate deployment configs - should fail if no HTML5 app found', async () => {
        const appName = 'standalone';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/standalone`), appPath);
        await expect(generateAppConfig({ appPath, addManagedAppRouter: false })).rejects.toThrowError(
            /No SAP Fiori UI5 application found./
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
        const fs = create(createStorage());
        const appPath = join(outputDir, 'supportingconfig');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        await generateSupportingConfig({ appPath, mtaId: 'testMtaId', rootPath: appPath } as unknown as CFConfig, fs);
        expect(fs.read(join(appPath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(appPath, '.gitignore'))).toMatchSnapshot();
    });

    test('Generate deployment configs - generateSupportingConfig read mtaId read from file', async () => {
        const fs = create(createStorage());
        const appPath = join(outputDir, 'supportingconfigreadmta');
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, 'fixtures/mta-types/cdsmta'), appPath);
        await generateSupportingConfig(
            { appPath, rootPath: appPath, addManagedAppRouter: true } as unknown as CFConfig,
            fs
        );
        expect(fs.read(join(appPath, 'package.json'))).toMatchSnapshot();
        expect(fs.read(join(appPath, '.gitignore'))).toMatchSnapshot();
        expect(fs.read(join(appPath, 'xs-security.json'))).toMatchSnapshot();
    });
});
