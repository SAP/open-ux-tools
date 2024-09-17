import { AuthenticationType } from '@sap-ux/store';

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
