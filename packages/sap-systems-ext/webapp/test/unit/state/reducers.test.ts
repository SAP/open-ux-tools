import type { SystemState } from '../../src/types';
import { LoadingState } from '../../src/types';
import { getInitialState, reducer } from '../../src/state/reducers';
import * as types from '@sap/ux-application-modeler-types';

const dummySystem = {
    name: 'dummySystem',
    url: 'https://dummy/url/',
    client: '000',
    credentials: {
        username: 'dummyUser',
        password: 'dummyPass'
    }
};

const connectionStatus = {
    message: '',
    connected: true
};

const editStatus = {
    message: '',
    savedSystemDetails: true
};

describe('Test getInitialState', () => {
    test('getInitialState', () => {
        const intialState = getInitialState();
        expect(intialState).toStrictEqual({
            name: '',
            type: undefined,
            url: '',
            client: '',
            credentials: {
                username: '',
                password: ''
            },
            unSaved: true,
            loadingState: LoadingState.Idle,
            testConnectionLoadingState: LoadingState.Idle,
            connectionStatus: {
                message: '',
                catalogResults: {
                    v2Request: {
                        count: 0
                    },
                    v4Request: {
                        count: 0
                    }
                },
                connected: false
            },
            editSystemStatus: {
                message: undefined,
                savedSystemDetails: false
            },
            addNewSapSystem: false,
            guidedAnswerLink: undefined,
            hideServiceKey: false
        });
    });
});

describe('Page Map redux actions', () => {
    let systemState: SystemState;

    beforeEach(() => {
        systemState = {
            name: '',
            url: '',
            client: '',
            credentials: {
                username: '',
                password: ''
            }
        };
    });

    test('Action UPDATE_SYSTEM_INFO', () => {
        const oAction: types.UpdateSystemInfo = {
            type: types.UPDATE_SYSTEM_INFO,
            payload: dummySystem
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action UPDATE_BCP_SYSTEM_KEY', () => {
        const oAction: types.UpdateBCPSystemKey = {
            type: types.UPDATE_BCP_SYSTEM_KEY,
            payload: { url: 'https://newurl', client: '001' }
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action LOADING_SYSTEM_INFO', () => {
        const oAction: types.LoadingSystemInfo = {
            type: types.LOADING_SYSTEM_INFO
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action LOADING_SYSTEM_INFO', () => {
        const oAction: types.LoadingTestConnectionInfo = {
            type: types.LOADING_TEST_SYSTEM_CONNECTION
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action SYSTEM_INFO_ERROR', () => {
        const oAction: types.SystemInfoError = {
            type: types.SYSTEM_INFO_ERROR
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action SYSTEM_CONNECTION_STATUS', () => {
        const oAction: types.SystemConnectionStatus = {
            type: types.SYSTEM_CONNECTION_STATUS,
            payload: {
                connectionStatus
            }
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action SYSTEM_EDIT_STATUS', () => {
        const oAction: types.EditSavedSystemStatus = {
            type: types.SYSTEM_EDIT_STATUS,
            payload: editStatus
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });

    test('Action ADD_NEW_SAP_SYSTEM', () => {
        const oAction: types.AddNewSapSystem = {
            type: types.ADD_NEW_SAP_SYSTEM,
            payload: {
                hideServiceKey: false
            }
        };
        expect(reducer(systemState, oAction)).toMatchSnapshot();
    });
});
