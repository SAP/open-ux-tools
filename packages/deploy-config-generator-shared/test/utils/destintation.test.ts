import { generateDestinationName, getDestination } from '../../src';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { mockDestinations } from '../fixtures/destinations';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const mockListDestinations = listDestinations as jest.Mock;

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
