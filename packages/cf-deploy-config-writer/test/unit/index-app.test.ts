import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import * as btp from '@sap-ux/btp-utils';
import { generateAppConfig } from '../../src';
import type { Editor } from 'mem-fs-editor';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

let isAppStudioMock: jest.SpyInstance;
let listDestinationsMock: jest.SpyInstance;

describe('CF Writer', () => {
    const destinationsMock = {
        'ABC123': {
            Name: 'ABC123',
            Type: 'MockType',
            Authentication: 'NoAuthentication',
            ProxyType: 'NoProxy',
            Description: 'MockDestination',
            Host: 'MockHost'
        }
    };
    let unitTestFs: Editor;
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const outputDir = join(__dirname, '../test-output');
    const debug = !!process.env['UX_DEBUG'];

    beforeEach(() => {
        jest.resetAllMocks();
        jest.restoreAllMocks();
        isAppStudioMock = jest.spyOn(btp, 'isAppStudio');
        listDestinationsMock = jest.spyOn(btp, 'listDestinations');
        unitTestFs = create(createStorage());
    });

    beforeAll(async () => {
        jest.clearAllMocks();
        jest.spyOn(hasbin, 'sync').mockReturnValue(true);
        fsExtra.removeSync(outputDir);
    });

    afterAll(async () => {
        jest.resetAllMocks();
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                unitTestFs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    describe('Generate HTML5 App Config', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('Generate deployment configs - HTML5 App', async () => {
            isAppStudioMock.mockResolvedValue(true);
            listDestinationsMock.mockResolvedValue(destinationsMock);
            const debugSpy = jest.spyOn(logger, 'debug');
            const appName = 'basicapp01';
            const appPath = join(outputDir, appName);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(appPath);
            fsExtra.copySync(join(__dirname, `../sample/basicapp`), appPath);

            await generateAppConfig({ appPath, destination: destinationsMock.ABC123.Name }, unitTestFs, logger);
            expect(isAppStudioMock).toBeCalledTimes(1);
            expect(listDestinationsMock).toBeCalledTimes(1);
            expect(debugSpy).toBeCalledTimes(1);
            expect(unitTestFs.dump(appPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
        });

        test('Generate deployment configs - HTML5 App with managed approuter attached', async () => {
            isAppStudioMock.mockResolvedValue(false);
            listDestinationsMock.mockResolvedValue(destinationsMock);
            const debugSpy = jest.spyOn(logger, 'debug');
            const appName = 'lrop';
            const appPath = join(outputDir, appName);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(appPath);
            fsExtra.copySync(join(__dirname, `../sample/lrop`), appPath);

            await generateAppConfig(
                { appPath, destination: destinationsMock.ABC123.Name, addManagedRouter: true },
                unitTestFs,
                logger
            );
            expect(isAppStudioMock).toBeCalledTimes(1);
            expect(listDestinationsMock).toBeCalledTimes(0);
            expect(debugSpy).toBeCalledTimes(1);
            expect(unitTestFs.dump(appPath)).toMatchSnapshot();
            // Since mta.yaml is not in memfs, read from disk
            expect(unitTestFs.read(join(appPath, 'mta.yaml'))).toMatchSnapshot();
        });
    });
});
