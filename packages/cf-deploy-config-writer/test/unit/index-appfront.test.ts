import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import * as btp from '@sap-ux/btp-utils';
import { generateAppConfig } from '../../src';

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

describe('CF Writer App - Application Frontend', () => {
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
    const outputDir = join(__dirname, '../test-output', 'appfrontend');

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

    test('Generate deployment configs - HTML5 App and destination read from ui5.yaml', async () => {
        isAppStudioMock.mockResolvedValue(true);
        listDestinationsMock.mockResolvedValue(destinationsMock);
        const appName = 'basicapp01';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, '../sample/basicapp'), appPath);
        const localFs = await generateAppConfig({ appPath, addManagedAppFrontend: true }, undefined, logger);
        expect(isAppStudioMock).toBeCalledTimes(1);
        // Since mta.yaml is not in memfs, read from disk
        expect(localFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
    });

    test('Generate deployment configs - HTML5 App with app frontend approuter attached with no destination available', async () => {
        isAppStudioMock.mockResolvedValue(false);
        const appName = 'lrop';
        const appPath = join(outputDir, appName);
        fsExtra.mkdirSync(outputDir, { recursive: true });
        fsExtra.mkdirSync(appPath);
        fsExtra.copySync(join(__dirname, `../sample/lrop`), appPath);
        const localFs = await generateAppConfig({ appPath, addManagedAppFrontend: true }, undefined, logger);
        expect(listDestinationsMock).toBeCalledTimes(0);
        // Since mta.yaml is not in memfs, read from disk
        expect(localFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
    });
});
