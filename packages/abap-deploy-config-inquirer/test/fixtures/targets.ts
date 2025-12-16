import { AuthenticationType, type BackendSystem } from '@sap-ux/store';

export const mockTargetSystems: BackendSystem[] = [
    {
        name: 'target1',
        url: 'https://mock.url.target1.com',
        client: '100',
        userDisplayName: 'mockUser',
        authenticationType: AuthenticationType.Basic,
        systemType: 'OnPrem',
        connectionType: 'abap_catalog'
    },
    {
        name: 'target2',
        url: 'https://mock.url.target2.com',
        client: '102',
        userDisplayName: 'mockUser2',
        authenticationType: AuthenticationType.ReentranceTicket,
        systemType: 'AbapCloud',
        connectionType: 'abap_catalog'
    },
    {
        name: 'target3',
        url: 'https://mock.url.target3.com',
        client: '103',
        userDisplayName: 'mockUser3',
        authenticationType: AuthenticationType.Basic,
        systemType: 'OnPrem',
        connectionType: 'abap_catalog'
    },
    {
        name: 'target4',
        url: 'https://mock.url.target4.com',
        client: '104',
        userDisplayName: 'mockUser4',
        authenticationType: AuthenticationType.Basic,
        systemType: 'OnPrem',
        connectionType: 'abap_catalog'
    }
];
