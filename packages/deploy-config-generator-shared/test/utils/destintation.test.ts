import { jest } from '@jest/globals';

const mockIsAppStudio = jest.fn();
const mockListDestinations = jest.fn();

jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations,
    Destination: {}
}));

const { generateDestinationName, getDestination } = await import('../../src');
const { mockDestinations } = await import('../fixtures/destinations');

describe('destination utils', () => {
    it('should generate destination name', () => {
        const destName = generateDestinationName('ABCD', 'service/path');
        expect(destName).toBe('ABCD_service_path');
    });

    it('should find destination', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockListDestinations.mockResolvedValueOnce(mockDestinations);
        const destResult = await getDestination(mockDestinations.Dest1.Name);
        expect(destResult).toStrictEqual(mockDestinations.Dest1);
    });
});
