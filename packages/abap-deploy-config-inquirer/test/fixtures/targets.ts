import { AuthenticationType, BackendSystem } from '@sap-ux/store';

export const mockTargetSystems = [
    {
        name: 'target1',
        url: 'https://mock.url.target1.com',
        client: '100',
        userDisplayName: 'mockUser'
    },
    {
        name: 'target2',
        url: 'https://mock.url.target2.com',
        client: '102',
        userDisplayName: 'mockUser2',
        authenticationType: AuthenticationType.ReentranceTicket,
        systemType: 'AbapCloud'
    },
    {
        name: 'target3',
        url: 'https://mock.url.target3.com',
        client: '103',
        userDisplayName: 'mockUser3'
    },
    {
        name: 'target4',
        url: 'https://mock.url.target4.com',
        client: '104',
        userDisplayName: 'mockUser4'
    }
];
