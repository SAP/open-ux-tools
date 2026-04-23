import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';
import { getToken, getBtpDestinationConfig } from '@sap-ux/adp-tooling';

import { hasOnPremiseDestination } from '../../../src/tunnel/destination-check';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    getToken: jest.fn(),
    getBtpDestinationConfig: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    DestinationProxyType: { ON_PREMISE: 'OnPremise' }
}));

const mockGetToken = getToken as jest.Mock;
const existsSyncMock = fs.existsSync as jest.Mock;
const readFileSyncMock = fs.readFileSync as jest.Mock;
const mockGetBtpDestinationConfig = getBtpDestinationConfig as jest.Mock;

describe('destination-check', () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    const rootPath = '/mock/project';

    const validVcapServices = JSON.stringify({
        destination: [
            {
                credentials: {
                    clientid: 'cid',
                    clientsecret: 'csecret',
                    url: '/auth.example',
                    uri: '/dest.example'
                }
            }
        ]
    });

    let savedVcapServices: string | undefined;

    beforeEach(() => {
        jest.clearAllMocks();
        savedVcapServices = process.env.VCAP_SERVICES;
        delete process.env.VCAP_SERVICES;
    });

    afterEach(() => {
        if (savedVcapServices !== undefined) {
            process.env.VCAP_SERVICES = savedVcapServices;
        } else {
            delete process.env.VCAP_SERVICES;
        }
    });

    describe('hasOnPremiseDestination', () => {
        test('should return false when webapp/xs-app.json does not exist', async () => {
            existsSyncMock.mockReturnValue(false);

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
            expect(existsSyncMock).toHaveBeenCalledWith(path.join(rootPath, 'webapp', 'xs-app.json'));
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No webapp/xs-app.json'));
        });

        test('should return false when xs-app.json has no routes with destinations', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(JSON.stringify({ routes: [{ source: '^/api/' }] }));

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
        });

        test('should return false when xs-app.json parse fails', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue('not-json');

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
        });

        test('should return false when VCAP_SERVICES is not set', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({ routes: [{ source: '^/api/', destination: 'backend' }] })
            );

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No destination service credentials'));
        });

        test('should return false when VCAP_SERVICES has invalid JSON', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({ routes: [{ source: '^/api/', destination: 'backend' }] })
            );
            process.env.VCAP_SERVICES = 'not-json';

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
        });

        test('should return false when no destination service in VCAP_SERVICES', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({ routes: [{ source: '^/api/', destination: 'backend' }] })
            );
            process.env.VCAP_SERVICES = JSON.stringify({ xsuaa: [] });

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
        });

        test('should return false when destination credentials are incomplete', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({ routes: [{ source: '^/api/', destination: 'backend' }] })
            );
            process.env.VCAP_SERVICES = JSON.stringify({
                destination: [{ credentials: { clientid: 'cid' } }]
            });

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
        });

        test('should return false when getToken fails', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({ routes: [{ source: '^/api/', destination: 'backend' }] })
            );
            process.env.VCAP_SERVICES = validVcapServices;
            mockGetToken.mockRejectedValue(new Error('Token error'));

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Token error'));
        });

        test('should return true when an OnPremise destination is found', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    routes: [
                        { source: '^/api/', destination: 'backend' },
                        { source: '^/odata/', destination: 'onprem-dest' }
                    ]
                })
            );
            process.env.VCAP_SERVICES = validVcapServices;
            mockGetToken.mockResolvedValue('mock-token');
            mockGetBtpDestinationConfig
                .mockResolvedValueOnce({ ProxyType: 'Internet' })
                .mockResolvedValueOnce({ ProxyType: 'OnPremise' });

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(true);
            expect(mockGetToken).toHaveBeenCalledWith(
                { clientid: 'cid', clientsecret: 'csecret', url: '/auth.example' },
                logger
            );
            expect(mockGetBtpDestinationConfig).toHaveBeenCalledTimes(2);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('onprem-dest'));
        });

        test('should return false when no destinations are OnPremise', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({ routes: [{ source: '^/api/', destination: 'backend' }] })
            );
            process.env.VCAP_SERVICES = validVcapServices;
            mockGetToken.mockResolvedValue('mock-token');
            mockGetBtpDestinationConfig.mockResolvedValue({ ProxyType: 'Internet' });

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(false);
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('No OnPremise destinations'));
        });

        test('should continue checking other destinations when one fails', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    routes: [
                        { source: '^/a/', destination: 'dest-a' },
                        { source: '^/b/', destination: 'dest-b' }
                    ]
                })
            );
            process.env.VCAP_SERVICES = validVcapServices;
            mockGetToken.mockResolvedValue('mock-token');
            mockGetBtpDestinationConfig
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ ProxyType: 'OnPremise' });

            const result = await hasOnPremiseDestination(rootPath, logger);

            expect(result).toBe(true);
            expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Could not check destination'));
        });

        test('should deduplicate destination names', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    routes: [
                        { source: '^/a/', destination: 'same-dest' },
                        { source: '^/b/', destination: 'same-dest' }
                    ]
                })
            );
            process.env.VCAP_SERVICES = validVcapServices;
            mockGetToken.mockResolvedValue('mock-token');
            mockGetBtpDestinationConfig.mockResolvedValue({ ProxyType: 'Internet' });

            await hasOnPremiseDestination(rootPath, logger);

            expect(mockGetBtpDestinationConfig).toHaveBeenCalledTimes(1);
        });
    });
});
