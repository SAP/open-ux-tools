import { jest } from '@jest/globals';

const mockGetSystemsOrDestinations = jest.fn<any>();

const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);
const actualBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio
}));

jest.unstable_mockModule('../../../src/tools/services/sap-system', () => ({
    getSystemsOrDestinations: mockGetSystemsOrDestinations
}));

const { listSapSystems } = await import('../../../src/tools/list-sap-systems.js');

describe('listSapSystems', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(false);
    });

    test('should return mapped list of SAP systems', async () => {
        const mockSystems = [
            { name: 'SystemA', url: 'https://system-a.example.com', client: '100', username: 'user', password: 'pass' },
            { name: 'SystemB', url: 'https://system-b.example.com', client: '200' }
        ];
        mockGetSystemsOrDestinations.mockResolvedValue(mockSystems);

        const result = await listSapSystems();

        expect(result).toEqual({
            systems: [
                { name: 'SystemA', url: 'https://system-a.example.com', client: '100' },
                { name: 'SystemB', url: 'https://system-b.example.com', client: '200' }
            ]
        });
    });

    test('should return empty systems array when no systems are stored', async () => {
        mockGetSystemsOrDestinations.mockResolvedValue([]);

        const result = await listSapSystems();

        expect(result).toEqual({ systems: [] });
    });

    test('should propagate errors from getSapSystems', async () => {
        mockGetSystemsOrDestinations.mockRejectedValue(new Error('Store unavailable'));

        await expect(listSapSystems()).rejects.toThrow('Store unavailable');
    });

    test('should strip sensitive fields like username and password', async () => {
        const mockSystems = [
            { name: 'Sys', url: 'https://example.com', client: '010', username: 'admin', password: 'secret' }
        ];
        mockGetSystemsOrDestinations.mockResolvedValue(mockSystems);

        const result = (await listSapSystems()) as { systems: object[] };

        expect(result.systems[0]).not.toHaveProperty('username');
        expect(result.systems[0]).not.toHaveProperty('password');
    });

    describe('BAS / AppStudio destination handling', () => {
        beforeEach(() => {
            mockIsAppStudio.mockReturnValue(true);
        });

        test('should map destinations using Name, Host and sap-client when isAppStudio is true', async () => {
            const mockDestinations = [
                { Name: 'DEST_A', Host: 'https://dest-a.example.com', 'sap-client': '100' },
                { Name: 'DEST_B', Host: 'https://dest-b.example.com', 'sap-client': '200' }
            ];
            mockGetSystemsOrDestinations.mockResolvedValue(mockDestinations);

            const result = await listSapSystems();

            expect(result).toEqual({
                systems: [
                    { name: 'DEST_A', url: 'https://dest-a.example.com', client: '100' },
                    { name: 'DEST_B', url: 'https://dest-b.example.com', client: '200' }
                ]
            });
        });

        test('should return empty systems when no destinations available in BAS', async () => {
            mockGetSystemsOrDestinations.mockResolvedValue([]);

            const result = await listSapSystems();

            expect(result).toEqual({ systems: [] });
        });
    });
});
