import { jest } from '@jest/globals';

const mockExistsSync = jest.fn<(path: string) => boolean>();
const mockReadFileSync = jest.fn<(path: string, enc: string) => string>();
const mockWriteFileSync = jest.fn<(path: string, data: string) => void>();

const actualFs = await import('node:fs');

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    default: actualFs.default,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync
}));

const { readAdtSystems, writeAdtSystem, deleteAdtSystem } =
    await import('../../../src/data-provider/adt-destinations.js');
const { BackendSystem, SystemType, AuthenticationType, ConnectionType, SystemSource } =
    await import('../../../src/index.js');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

const logger = new ToolsLogger({ transports: [new NullTransport()] });

const DESTINATIONS = {
    formatVersion: '1.0',
    destinations: [
        // RFC destination – must be ignored (no usable system URL).
        {
            id: 'SID_100_USER_EN',
            protocol: 'rfc',
            properties: { systemId: 'SID', messageServer: 'msg.example.com', client: '100', user: 'USER' }
        },
        // HTTP destination with reentrance-ticket auth – surfaced as an ABAP-on-BTP system.
        {
            id: 'CLOUD',
            protocol: 'http',
            properties: {
                authenticationKind: 'reentranceticket',
                systemUrl: 'https://app.example.com:44301',
                user: 'USER'
            }
        }
    ]
};

describe('ADT destinations data source', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(DESTINATIONS));
    });

    describe('readAdtSystems', () => {
        it('maps only HTTP destinations to ABAP-on-BTP systems tagged with the ADT origin', () => {
            const systems = readAdtSystems(logger);

            const ids = Object.keys(systems);
            expect(ids).toEqual(['https://app.example.com:44301']); // RFC entry excluded
            const system = systems['https://app.example.com:44301'];
            expect(system).toMatchObject({
                name: 'CLOUD',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapCloud,
                authenticationType: AuthenticationType.ReentranceTicket,
                connectionType: ConnectionType.AbapCatalog,
                username: 'USER',
                userDisplayName: 'USER',
                source: SystemSource.Adt
            });
        });

        it('returns an empty map when the destinations file does not exist', () => {
            mockExistsSync.mockReturnValue(false);
            expect(readAdtSystems(logger)).toEqual({});
        });

        it('returns an empty map on malformed JSON', () => {
            mockReadFileSync.mockReturnValue('{ not json');
            expect(readAdtSystems(logger)).toEqual({});
        });
    });

    describe('writeAdtSystem', () => {
        it('updates the matching HTTP destination and preserves other entries', () => {
            const system = new BackendSystem({
                name: 'CLOUD',
                url: 'https://app.example.com:44301',
                authenticationType: AuthenticationType.ReentranceTicket,
                systemType: SystemType.AbapCloud,
                connectionType: ConnectionType.AbapCatalog,
                username: 'NEWUSER',
                source: SystemSource.Adt
            });

            const updated = writeAdtSystem(system, logger);

            expect(updated).toBe(true);
            const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
            // RFC entry preserved untouched
            expect(written.destinations.find((d: { id: string }) => d.id === 'SID_100_USER_EN')).toMatchObject({
                protocol: 'rfc'
            });
            // HTTP entry updated with the new user
            const httpEntry = written.destinations.find((d: { id: string }) => d.id === 'CLOUD');
            expect(httpEntry.properties.user).toBe('NEWUSER');
            expect(httpEntry.properties.systemUrl).toBe('https://app.example.com:44301');
            expect(httpEntry.properties.authenticationKind).toBe('reentranceticket');
        });

        it('appends a new HTTP destination when none matches', () => {
            const system = new BackendSystem({
                name: 'NEW_CLOUD',
                url: 'https://other.example.com:44301',
                authenticationType: AuthenticationType.ReentranceTicket,
                systemType: SystemType.AbapCloud,
                connectionType: ConnectionType.AbapCatalog,
                source: SystemSource.Adt
            });

            writeAdtSystem(system, logger);

            const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
            expect(written.destinations).toHaveLength(3);
            expect(written.destinations.find((d: { id: string }) => d.id === 'NEW_CLOUD')).toMatchObject({
                protocol: 'http',
                properties: { systemUrl: 'https://other.example.com:44301', authenticationKind: 'reentranceticket' }
            });
        });
    });

    describe('deleteAdtSystem', () => {
        it('removes the matching HTTP destination and keeps the rest', () => {
            const system = new BackendSystem({
                name: 'CLOUD',
                url: 'https://app.example.com:44301',
                systemType: SystemType.AbapCloud,
                connectionType: ConnectionType.AbapCatalog,
                source: SystemSource.Adt
            });

            const removed = deleteAdtSystem(system, logger);

            expect(removed).toBe(true);
            const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
            expect(written.destinations).toHaveLength(1);
            expect(written.destinations[0].id).toBe('SID_100_USER_EN');
        });

        it('returns false when nothing matches', () => {
            const system = new BackendSystem({
                name: 'ABSENT',
                url: 'https://absent.example.com:44301',
                systemType: SystemType.AbapCloud,
                connectionType: ConnectionType.AbapCatalog,
                source: SystemSource.Adt
            });
            expect(deleteAdtSystem(system, logger)).toBe(false);
            expect(mockWriteFileSync).not.toHaveBeenCalled();
        });
    });
});
