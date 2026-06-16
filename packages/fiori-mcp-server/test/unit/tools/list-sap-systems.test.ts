import { jest } from '@jest/globals';

const mockGetSapSystems = jest.fn<any>();

jest.unstable_mockModule('../../../src/tools/services/sap-system', () => ({
    getSapSystems: mockGetSapSystems
}));

const { listSapSystems } = await import('../../../src/tools/list-sap-systems.js');

describe('listSapSystems', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return mapped list of SAP systems', async () => {
        const mockSystems = [
            { name: 'SystemA', url: 'https://system-a.example.com', client: '100', username: 'user', password: 'pass' },
            { name: 'SystemB', url: 'https://system-b.example.com', client: '200' }
        ];
        mockGetSapSystems.mockResolvedValue(mockSystems);

        const result = await listSapSystems();

        expect(result).toEqual({
            systems: [
                { name: 'SystemA', url: 'https://system-a.example.com', client: '100' },
                { name: 'SystemB', url: 'https://system-b.example.com', client: '200' }
            ]
        });
    });

    test('should return empty systems array when no systems are stored', async () => {
        mockGetSapSystems.mockResolvedValue([]);

        const result = await listSapSystems();

        expect(result).toEqual({ systems: [] });
    });

    test('should propagate errors from getSapSystems', async () => {
        mockGetSapSystems.mockRejectedValue(new Error('Store unavailable'));

        await expect(listSapSystems()).rejects.toThrow('Store unavailable');
    });

    test('should strip sensitive fields like username and password', async () => {
        const mockSystems = [
            { name: 'Sys', url: 'https://example.com', client: '010', username: 'admin', password: 'secret' }
        ];
        mockGetSapSystems.mockResolvedValue(mockSystems);

        const result = (await listSapSystems()) as { systems: object[] };

        expect(result.systems[0]).not.toHaveProperty('username');
        expect(result.systems[0]).not.toHaveProperty('password');
    });
});
