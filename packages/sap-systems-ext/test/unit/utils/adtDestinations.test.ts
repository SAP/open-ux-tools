import * as vscodeMod from 'vscode';
import { readFileSync } from 'node:fs';
import { listAdtDestinations, resolveAdtDestination } from '../../../src/utils/adtDestinations';
import { discoverHttpsEndpoint } from '../../../src/utils/abapEndpointDiscovery';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    readFileSync: jest.fn()
}));

jest.mock('../../../src/utils/abapEndpointDiscovery', () => ({
    discoverHttpsEndpoint: jest.fn()
}));

const readFileSyncMock = readFileSync as jest.Mock;
const discoverHttpsEndpointMock = discoverHttpsEndpoint as jest.Mock;
const getExtensionMock = vscodeMod.extensions.getExtension as jest.Mock;
const executeCommandMock = vscodeMod.commands.executeCommand as jest.Mock;

const DESTINATIONS_FILE = JSON.stringify({
    destinations: [
        {
            id: 'SID_100_USER_EN',
            protocol: 'rfc',
            properties: { systemId: 'SID', client: '000', user: 'USER', messageServer: 'msg.example.com' }
        },
        { id: 'CLOUD', protocol: 'http', properties: { systemUrl: 'https://app.example.com:44301' } }
    ]
});

describe('listAdtDestinations', () => {
    afterEach(() => jest.clearAllMocks());

    it('lists via the ADT command (metadata only) without resolving endpoints', async () => {
        const metadata = [{ id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', user: 'USER' }];
        getExtensionMock.mockReturnValue({ id: 'SAPSE.adt-vscode' });
        executeCommandMock.mockResolvedValue(metadata);

        const result = await listAdtDestinations(['rfc']);

        expect(executeCommandMock).toHaveBeenCalledWith('adt-vscode.getDestinationsWithHttpDetails', {
            protocol: ['rfc']
        });
        expect(result).toEqual(metadata);
        expect(discoverHttpsEndpointMock).not.toHaveBeenCalled();
        expect(readFileSyncMock).not.toHaveBeenCalled();
    });

    it('falls back to the file and applies the protocol filter (no discovery)', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(DESTINATIONS_FILE);

        const result = await listAdtDestinations(['rfc']);

        expect(discoverHttpsEndpointMock).not.toHaveBeenCalled();
        expect(result).toEqual([
            { id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', user: 'USER' }
        ]);
    });

    it('returns an empty list when the file is missing', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockImplementation(() => {
            throw new Error('ENOENT');
        });

        expect(await listAdtDestinations()).toEqual([]);
    });
});

describe('resolveAdtDestination', () => {
    afterEach(() => jest.clearAllMocks());

    it('resolves a single destination via the ADT command with an id filter', async () => {
        const resolved = [
            { id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', url: 'https://app:44300' }
        ];
        getExtensionMock.mockReturnValue({ id: 'SAPSE.adt-vscode' });
        executeCommandMock.mockResolvedValue(resolved);

        const result = await resolveAdtDestination('SID_100_USER_EN');

        expect(executeCommandMock).toHaveBeenCalledWith('adt-vscode.getDestinationsWithHttpDetails', {
            id: 'SID_100_USER_EN'
        });
        expect(result).toEqual(resolved[0]);
    });

    it('falls back to the file and discovers the HTTPS endpoint for the requested id only', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(DESTINATIONS_FILE);
        discoverHttpsEndpointMock.mockResolvedValue({
            url: 'https://app.example.com:44300',
            host: 'app.example.com',
            port: '44300'
        });

        const result = await resolveAdtDestination('SID_100_USER_EN');

        expect(discoverHttpsEndpointMock).toHaveBeenCalledTimes(1);
        expect(discoverHttpsEndpointMock).toHaveBeenCalledWith('msg.example.com', '000');
        expect(result).toEqual({
            id: 'SID_100_USER_EN',
            protocol: 'rfc',
            systemId: 'SID',
            client: '000',
            user: 'USER',
            url: 'https://app.example.com:44300',
            host: 'app.example.com',
            port: '44300'
        });
    });

    it('returns the destination without url when discovery fails', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(DESTINATIONS_FILE);
        discoverHttpsEndpointMock.mockResolvedValue(undefined);

        const result = await resolveAdtDestination('SID_100_USER_EN');

        expect(result?.url).toBeUndefined();
        expect(result?.id).toBe('SID_100_USER_EN');
    });

    it('returns undefined when the id is not found in the file', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(DESTINATIONS_FILE);

        expect(await resolveAdtDestination('MISSING')).toBeUndefined();
        expect(discoverHttpsEndpointMock).not.toHaveBeenCalled();
    });
});
