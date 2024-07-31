import { AuthenticationType } from '@sap-ux/store';

export const mockDestinations = {
    Dest1: {
        Name: 'Dest1',
        Type: 'HTTP',
        Authentication: 'BasicAuthentication',
        Description: 'Mock destination',
        Host: 'https://mock.url.dest1.com',
        ProxyType: 'OnPremise'
    },
    Dest2: {
        Name: 'Dest2',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        Description: 'Mock destination 2',
        Host: 'https://mock.url.dest2.com',
        ProxyType: 'OnPremise'
    }
};

export const mockTargetSystems = [
    {
        name: 'target1',
        url: 'https://mock.url.target1.com',
        client: '000',
        userDisplayName: 'mockUser'
    },
    {
        name: 'target2',
        url: 'https://mock.url.target2.com',
        client: '001',
        userDisplayName: 'mockUser2',
        authenticationType: AuthenticationType.ReentranceTicket
    }
];
