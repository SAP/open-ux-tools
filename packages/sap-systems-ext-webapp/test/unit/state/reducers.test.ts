import type { SystemState } from '../../../src/types';
import type { BackendSystem } from '@sap-ux/store';
import { LoadingState } from '../../../src/types';
import { getInitialState, reducer } from '../../../src/state/reducers';
import * as types from '@sap-ux/sap-systems-ext-types';

const connectionStatus = {
    message: '',
    connected: true
};

const updateStatus = {
    message: '',
    updateSuccess: true
};

describe('Test getInitialState', () => {
    test('getInitialState', () => {
        const intialState = getInitialState();
        expect(intialState).toStrictEqual({
            systemInfo: undefined,
            unSaved: true,
            loadingState: LoadingState.Idle,
            testConnectionLoadingState: LoadingState.Idle,
            connectionStatus: {
                message: '',
                catalogResults: {
                    v4Request: {
                        count: 0
                    },
                    v2Request: {
                        count: 0
                    }
                },
                connected: false
            },
            updateSystemStatus: {
                message: '',
                updateSuccess: false
            },
            addNewSapSystem: false,
            guidedAnswerLink: undefined
        });
    });
});

describe('Test the reducer', () => {
    let systemState: SystemState;

    beforeEach(() => {
        systemState = {
            systemInfo: {
                name: '',
                url: '',
                client: '',
                username: '',
                password: ''
            } as BackendSystem
        };
    });

    test('Action UPDATE_SYSTEM_STATUS', () => {
        const oAction: types.UpdateSystemStatus = {
            type: types.UPDATE_SYSTEM_STATUS,
            payload: {
                message: 'Update successful',
                updateSuccess: true
            }
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action SYSTEM_INFO_LOADING', () => {
        const oAction: types.SystemInfoLoading = {
            type: types.SYSTEM_INFO_LOADING
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action TEST_CONNECTION_LOADING', () => {
        const oAction: types.TestConnectionLoading = {
            type: types.TEST_CONNECTION_LOADING
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action SYSTEM_INFO_ERROR', () => {
        const oAction: types.SystemInfoError = {
            type: types.SYSTEM_INFO_ERROR
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action TEST_CONNECTION_STATUS', () => {
        const oAction: types.TestConnectionStatus = {
            type: types.TEST_CONNECTION_STATUS,
            payload: {
                connectionStatus
            }
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action UPDATE_SYSTEM_STATUS', () => {
        const oAction: types.UpdateSystemStatus = {
            type: types.UPDATE_SYSTEM_STATUS,
            payload: updateStatus
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action CREATE_NEW_SYSTEM', () => {
        const oAction: types.CreateNewSystem = {
            type: types.CREATE_NEW_SYSTEM
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });
});
