import {
    isAppStudio,
    listDestinations,
    getDisplayName,
    isAbapEnvironmentOnBtp,
    type Destinations
} from '@sap-ux/btp-utils';
import { getCfSystemChoices, fetchBTPDestinations } from '../src/prompts/prompt-helpers';
import type { CfSystemChoice } from '../src/types';
import LoggerHelper from '../src/logger-helper';
import { t } from '../src/i18n';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    listDestinations: jest.fn(),
    getDisplayName: jest.fn(),
    isAbapEnvironmentOnBtp: jest.fn()
}));

jest.mock('../src/logger-helper', () => ({
    logger: {
        warn: jest.fn()
    }
}));

describe('Utility Functions', () => {
    const mockDestinations: Destinations = {
        dest1: {
            Name: 'Dest1',
            Type: 'HTTP',
            Authentication: 'NoAuthentication',
            ProxyType: 'Internet',
            Description: 'Test Destination',
            Host: 'host'
        },
        dest2: {
            Name: '',
            Type: 'HTTP',
            Authentication: 'NoAuthentication',
            ProxyType: 'Internet',
            Description: 'Test Destination ',
            Host: 'host'
        }
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCfSystemChoices', () => {
        it('should return destination choices when destinations are provided', async () => {
            const choices: CfSystemChoice[] = [
                { name: 'Dest1 - host', value: '', scp: false, url: 'host' },
                { name: 'Unknown - host', value: 'Dest1', scp: false, url: 'host' }
            ];
            (getDisplayName as jest.Mock).mockReturnValueOnce('Dest1');
            (isAbapEnvironmentOnBtp as jest.Mock).mockReturnValueOnce(false);

            const result = await getCfSystemChoices(mockDestinations);

            expect(result).toEqual(choices);
        });

        it('should return an empty array if no destinations are provided', async () => {
            const result = await getCfSystemChoices();
            expect(result).toEqual([]);
        });

        it('should return sorted and formatted destination choices', async () => {
            const destinations: Destinations = {
                ...mockDestinations,
                dest2: {
                    Name: 'Dest2',
                    Host: 'host2',
                    Type: 'HTTP',
                    Authentication: 'NoAuthentication',
                    ProxyType: 'Internet',
                    Description: 'Test Destination 2'
                }
            };
            (getDisplayName as jest.Mock).mockImplementation((dest) => dest.Name);
            (isAbapEnvironmentOnBtp as jest.Mock).mockReturnValue(false);

            const result = await getCfSystemChoices(destinations);

            expect(result).toEqual([
                { name: 'Dest1 - host', value: 'Dest1', scp: false, url: 'host' },
                { name: 'Dest2 - host2', value: 'Dest2', scp: false, url: 'host2' }
            ]);
        });
    });

    describe('fetchBTPDestinations', () => {
        it('should return destinations if running in App Studio', async () => {
            (isAppStudio as jest.Mock).mockReturnValue(true);
            (listDestinations as jest.Mock).mockResolvedValue(mockDestinations);

            const result = await fetchBTPDestinations();

            expect(result).toEqual(mockDestinations);
            expect(isAppStudio).toHaveBeenCalled();
            expect(listDestinations).toHaveBeenCalled();
        });

        it('should return undefined if not running in App Studio', async () => {
            (isAppStudio as jest.Mock).mockReturnValue(false);

            const result = await fetchBTPDestinations();

            expect(result).toBeUndefined();
            expect(isAppStudio).toHaveBeenCalled();
            expect(listDestinations).not.toHaveBeenCalled();
            expect(LoggerHelper.logger.warn).toHaveBeenCalledWith(t('warning.btpDestinationListWarning'));
        });
    });
});
