import type { BackendSystem } from '@sap-ux/store';

export const backendSystemOnPrem: BackendSystem = {
    url: 'https://example.abap.backend:44300',
    client: '100',
    name: 'SYS_010',
    password: 'some-pw',
    userDisplayName: 'some-name',
    username: 'some-user'
};

export const backendSystemBtp: BackendSystem = {
    url: 'https://example.abap.backend:44300',
    client: '100',
    name: 'SYS_BTP',
    serviceKeys: '<MOCK SERVICE KEYS FOR SYS_BTP>',
    userDisplayName: 'some-name'
};
