import fs from 'node:fs';

import { hasOnPremiseDestination } from '../../../src/destination-check';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

const existsSyncMock = fs.existsSync as jest.Mock;
const readFilesSyncMock = fs.readFileSync as jest.Mock;

const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as unknown as Parameters<typeof hasOnPremiseDestination>[1];

const DEST_SERVICE_VCAP = JSON.stringify({
    destination: [
        {
            credentials: {
                clientid: 'test-client',
                clientsecret: 'test-secret',
                uri: 'https://destination-configuration.example.com',
                url: 'https://auth.example.com'
            }
        }
    ]
});

describe('destination-check', () => {
    const rootPath = '/project/root';
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.VCAP_SERVICES;
    });

    afterEach(() => {
        delete process.env.VCAP_SERVICES;
    });

    test('returns false when webapp/xs-app.json does not exist', async () => {
        existsSyncMock.mockReturnValue(false);

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('returns false when xs-app.json has no routes with destinations', async () => {
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(JSON.stringify({ routes: [{ source: '^/(.*)$', localDir: 'webapp' }] }));

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('returns false when xs-app.json has empty routes', async () => {
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(JSON.stringify({ routes: [] }));

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
    });

    test('returns false when xs-app.json cannot be parsed', async () => {
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue('not-json');

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
    });

    test('returns false when VCAP_SERVICES is not set', async () => {
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({ routes: [{ source: '^/sap/(.*)$', destination: 'MY_DEST' }] })
        );

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    test('returns false when VCAP_SERVICES has no destination service', async () => {
        process.env.VCAP_SERVICES = JSON.stringify({ xsuaa: [] });
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({ routes: [{ source: '^/sap/(.*)$', destination: 'MY_DEST' }] })
        );

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
    });

    test('returns false and warns when OAuth token fetch fails', async () => {
        process.env.VCAP_SERVICES = DEST_SERVICE_VCAP;
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({ routes: [{ source: '^/sap/(.*)$', destination: 'MY_DEST' }] })
        );
        fetchSpy.mockResolvedValueOnce({ ok: false, status: 401 } as Response);

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to obtain OAuth token'));
    });

    test('returns true when destination is OnPremise', async () => {
        process.env.VCAP_SERVICES = DEST_SERVICE_VCAP;
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({ routes: [{ source: '^/sap/(.*)$', destination: 'ON_PREM_DEST' }] })
        );

        // Token response
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'test-token' })
        } as Response);
        // Destination lookup response
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ destinationConfiguration: { ProxyType: 'OnPremise' } })
        } as Response);

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('OnPremise'));
    });

    test('returns false when all destinations are Internet type', async () => {
        process.env.VCAP_SERVICES = DEST_SERVICE_VCAP;
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({
                routes: [
                    { source: '^/api1/(.*)$', destination: 'DEST_A' },
                    { source: '^/api2/(.*)$', destination: 'DEST_B' }
                ]
            })
        );

        // Token response
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'test-token' })
        } as Response);
        // Destination A
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ destinationConfiguration: { ProxyType: 'Internet' } })
        } as Response);
        // Destination B
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ destinationConfiguration: { ProxyType: 'Internet' } })
        } as Response);

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(false);
    });

    test('returns true even if some destination lookups fail, as long as one is OnPremise', async () => {
        process.env.VCAP_SERVICES = DEST_SERVICE_VCAP;
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({
                routes: [
                    { source: '^/api1/(.*)$', destination: 'FAIL_DEST' },
                    { source: '^/api2/(.*)$', destination: 'ON_PREM_DEST' }
                ]
            })
        );

        // Token response
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'test-token' })
        } as Response);
        // First destination lookup fails
        fetchSpy.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
        // Second destination is OnPremise
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ destinationConfiguration: { ProxyType: 'OnPremise' } })
        } as Response);

        const result = await hasOnPremiseDestination(rootPath, mockLogger);

        expect(result).toBe(true);
    });

    test('deduplicates destination names from routes', async () => {
        process.env.VCAP_SERVICES = DEST_SERVICE_VCAP;
        existsSyncMock.mockReturnValue(true);
        readFilesSyncMock.mockReturnValue(
            JSON.stringify({
                routes: [
                    { source: '^/api1/(.*)$', destination: 'SAME_DEST' },
                    { source: '^/api2/(.*)$', destination: 'SAME_DEST' }
                ]
            })
        );

        // Token response
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'test-token' })
        } as Response);
        // Only one destination lookup expected
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ destinationConfiguration: { ProxyType: 'Internet' } })
        } as Response);

        await hasOnPremiseDestination(rootPath, mockLogger);

        // Token call + 1 destination call = 2 total (not 3)
        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
