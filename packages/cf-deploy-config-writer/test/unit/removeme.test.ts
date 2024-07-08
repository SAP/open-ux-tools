import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { ConsoleTransport, ToolsLogger, LogLevel } from '@sap-ux/logger';
import { generateAppConfig, generateBaseConfig } from '../../src';
import { CFAppConfig, CFBaseConfig } from '../../src/types';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

describe('CF Writer', () => {
    const unitTestFs = create(createStorage());
    const logger = new ToolsLogger({
        logLevel: LogLevel.Debug,
        transports: [new ConsoleTransport()],
        logPrefix: 'unitest'
    });

    afterAll(async () => {
        return new Promise((resolve) => {
            unitTestFs.commit(resolve);
        });
    });

    describe('Generate', () => {
        test('Generate deployment configs', async () => {
            const fs = await generateAppConfig(
                {
                    appPath: '/Users/i313149/Documents/tools-suite-test/testmtagenerate/',
                    addManagedApprouter: true,
                    destination: 'testme'
                } as CFAppConfig,
                undefined,
                logger
            );
            fs.commit(() => {});
            expect(true).toEqual(true);
        });
        test('Generate deployment configs -standalone', async () => {
            const fs = await generateBaseConfig(
                {
                    appPath: '/Users/i313149/Documents/tools-suite-test/cap-fiori-mta-standalone',
                    mtaId: 'teststandalone',
                    routerType: 'standalone'
                } as CFBaseConfig,
                undefined,
                logger
            );
            fs.commit(() => {});
            expect(true).toEqual(true);
        });
    });
});
