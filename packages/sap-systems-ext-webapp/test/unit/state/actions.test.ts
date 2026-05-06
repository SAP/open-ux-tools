import type { BackendSystem } from '@sap-ux/store';
import * as actions from '../../../src/state/actions';
import * as types from '@sap-ux/sap-systems-ext-types';

describe('Store redux actions', () => {
    const system: BackendSystem = {
        name: '',
        url: '',
        client: '',
        username: '',
        password: '',
        connectionType: 'abap_catalog',
        systemType: 'OnPrem'
    };

    test('Create "storeWebviewReady" action', () => {
        const expectedAction = {
            type: types.WEBVIEW_READY
        };
        const action = actions.webViewReady();
        expect(action).toEqual(expectedAction);
    });

    test('Create "updateSystemInfo" action', () => {
        const expectedAction = {
            type: types.UPDATE_SYSTEM,
            payload: {
                system
            }
        };
        const action = actions.updateSystem(system);
        expect(action).toEqual(expectedAction);
    });

    test('Create "openExistingSystem" action', () => {
        const expectedAction = {
            type: types.OPEN_EXISTING_SYSTEM,
            payload: {
                url: 'https://existing.system.com',
                client: '100'
            }
        };
        const action = actions.openExistingSystem('https://existing.system.com', '100');
        expect(action).toEqual(expectedAction);
    });

    test('Create "openExistingSystem" action without client', () => {
        const expectedAction = {
            type: types.OPEN_EXISTING_SYSTEM,
            payload: {
                url: 'https://existing.system.com',
                client: undefined
            }
        };
        const action = actions.openExistingSystem('https://existing.system.com');
        expect(action).toEqual(expectedAction);
    });
});
