import { join } from 'path';
import fsExtra from 'fs-extra';
import hasbin from 'hasbin';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import * as btp from '@sap-ux/btp-utils';
import { generate } from '../../src';

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
    const unitTestFs = create(createStorage());
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

    describe('Generate', () => {
        test('Generate deployment configs', async () => {
            isAppStudioMock.mockResolvedValue(true);
            listDestinationsMock.mockResolvedValue(destinationsMock);
            const debugSpy = jest.spyOn(logger, 'debug');
            const appName = 'basicapp';
            const testPath = join(outputDir, appName);
            fsExtra.mkdirSync(outputDir, { recursive: true });
            fsExtra.mkdirSync(testPath);
            fsExtra.copySync(join(__dirname, `../sample/${appName}`), testPath);

            await generate(testPath, { destination: destinationsMock.ABC123.Name }, unitTestFs, logger);
            expect(isAppStudioMock).toBeCalledTimes(1);
            expect(listDestinationsMock).toBeCalledTimes(1);
            expect(debugSpy).toBeCalledWith();
            unitTestFs.dump(testPath);
            //expect(unitTestFs.dump(testPath)).toMatchSnapshot();
        });
    });
});
