import * as vscodeMod from 'vscode';
import { readFileSync } from 'node:fs';
import { resolveAdtDestinations } from '../../../src/utils/adtDestinations';
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

describe('resolveAdtDestinations', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('uses the ADT extension command when the extension is available', async () => {
        const resolved = [{ id: 'SID_100_USER_EN', protocol: 'rfc', systemId: 'SID', client: '000', url: 'https://host:44300' }];
        getExtensionMock.mockReturnValue({ id: 'SAPSE.adt-vscode' });
        executeCommandMock.mockResolvedValue(resolved);

        const result = await resolveAdtDestinations();

        expect(executeCommandMock).toHaveBeenCalledWith('adt-vscode.getDestinationsWithHttpDetails');
        expect(result).toEqual(resolved);
        expect(readFileSyncMock).not.toHaveBeenCalled();
        expect(discoverHttpsEndpointMock).not.toHaveBeenCalled();
    });

    it('falls back to the file and discovers the HTTPS endpoint when the ADT extension is not installed', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(
            JSON.stringify({
                destinations: [
                    {
                        id: 'SID_100_USER_EN',
                        protocol: 'rfc',
                        properties: { systemId: 'SID', client: '000', user: 'USER', messageServer: 'msg.example.com' }
                    }
                ]
            })
        );
        discoverHttpsEndpointMock.mockResolvedValue({
            url: 'https://app.example.com:44300',
            host: 'app.example.com',
            port: '44300'
        });

        const result = await resolveAdtDestinations();

        expect(executeCommandMock).not.toHaveBeenCalled();
        expect(discoverHttpsEndpointMock).toHaveBeenCalledWith('msg.example.com', '000');
        expect(result).toEqual([
            {
                id: 'SID_100_USER_EN',
                protocol: 'rfc',
                systemId: 'SID',
                client: '000',
                user: 'USER',
                url: 'https://app.example.com:44300',
                host: 'app.example.com',
                port: '44300'
            }
        ]);
    });

    it('returns the destination without url when discovery fails', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(
            JSON.stringify({
                destinations: [
                    { id: 'SID_100_USER_EN', protocol: 'rfc', properties: { client: '000', messageServer: 'msg.example.com' } }
                ]
            })
        );
        discoverHttpsEndpointMock.mockResolvedValue(undefined);

        const result = await resolveAdtDestinations();

        expect(result[0].url).toBeUndefined();
        expect(result[0].id).toBe('SID_100_USER_EN');
    });

    it('does not attempt discovery for destinations without a message server', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockReturnValue(JSON.stringify({ destinations: [{ id: 'X', properties: {} }] }));

        const result = await resolveAdtDestinations();

        expect(discoverHttpsEndpointMock).not.toHaveBeenCalled();
        expect(result).toEqual([{ id: 'X', protocol: undefined, systemId: undefined, client: undefined }]);
    });

    it('falls back to the file when the ADT command is not registered (throws)', async () => {
        getExtensionMock.mockReturnValue({ id: 'SAPSE.adt-vscode' });
        executeCommandMock.mockRejectedValue(new Error('command not found'));
        readFileSyncMock.mockReturnValue(JSON.stringify({ destinations: [{ id: 'X', properties: {} }] }));

        const result = await resolveAdtDestinations();

        expect(result).toEqual([{ id: 'X', protocol: undefined, systemId: undefined, client: undefined }]);
    });

    it('returns an empty list when neither the command nor the file is available', async () => {
        getExtensionMock.mockReturnValue(undefined);
        readFileSyncMock.mockImplementation(() => {
            throw new Error('ENOENT');
        });

        const result = await resolveAdtDestinations();

        expect(result).toEqual([]);
    });
});
