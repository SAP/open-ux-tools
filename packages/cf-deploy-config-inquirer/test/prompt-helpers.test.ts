import { jest } from '@jest/globals';

// Pre-import real modules before mocking
const realBtpUtils = await import('@sap-ux/btp-utils');

const mockIsAppStudio = jest.fn();
const mockListDestinations = jest.fn();
const mockGetDisplayName = jest.fn();
const mockIsAbapEnvironmentOnBtp = jest.fn();

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations,
    getDisplayName: mockGetDisplayName,
    isAbapEnvironmentOnBtp: mockIsAbapEnvironmentOnBtp
}));

jest.unstable_mockModule('../src/logger-helper', () => ({
    default: {
        logger: {
            warn: jest.fn()
        }
    },
    logger: {
        warn: jest.fn()
    }
}));

const { getCfSystemChoices, fetchBTPDestinations } = await import('../src/prompts/prompt-helpers');
const LoggerHelper = (await import('../src/logger-helper')).default;
const { t } = await import('../src/i18n');
import type { CfSystemChoice } from '../src';
import type { Destinations } from '@sap-ux/btp-utils';

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
            mockGetDisplayName.mockReturnValueOnce('Dest1');
            mockIsAbapEnvironmentOnBtp.mockReturnValueOnce(false);

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
            mockGetDisplayName.mockImplementation((dest: any) => dest.Name);
            mockIsAbapEnvironmentOnBtp.mockReturnValue(false);

            const result = await getCfSystemChoices(destinations);

            expect(result).toEqual([
                { name: 'Dest1 - host', value: 'Dest1', scp: false, url: 'host' },
                { name: 'Dest2 - host2', value: 'Dest2', scp: false, url: 'host2' }
            ]);
        });
    });

    describe('fetchBTPDestinations', () => {
        it('should return destinations if running in App Studio', async () => {
            mockIsAppStudio.mockReturnValue(true);
            mockListDestinations.mockResolvedValue(mockDestinations);

            const result = await fetchBTPDestinations();

            expect(result).toEqual(mockDestinations);
            expect(mockIsAppStudio).toHaveBeenCalled();
            expect(mockListDestinations).toHaveBeenCalled();
        });

        it('should return undefined if not running in App Studio', async () => {
            mockIsAppStudio.mockReturnValue(false);

            const result = await fetchBTPDestinations();

            expect(result).toBeUndefined();
            expect(mockIsAppStudio).toHaveBeenCalled();
            expect(mockListDestinations).not.toHaveBeenCalled();
            expect(LoggerHelper.logger.warn).toHaveBeenCalledWith(t('warning.btpDestinationListWarning'));
        });
    });
});
