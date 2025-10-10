import type { Reducer } from 'redux';
import type { SystemState } from '../types';
import type { ExtensionActions } from '@sap-ux/sap-systems-ext-types';
import { LoadingState } from '../types';
import {
    SYSTEM_INFO,
    SYSTEM_INFO_LOADING,
    SYSTEM_INFO_ERROR,
    TEST_CONNECTION_STATUS,
    TEST_CONNECTION_LOADING,
    UPDATE_SYSTEM_STATUS,
    CREATE_NEW_SYSTEM
} from '@sap-ux/sap-systems-ext-types';

export function getInitialState(): SystemState {
    return {
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
    };
}

export const reducer: Reducer<SystemState, ExtensionActions> = (
    state: SystemState = getInitialState(),
    action: ExtensionActions
): SystemState => {
    switch (action.type) {
        case SYSTEM_INFO:
            return {
                systemInfo: action.payload.systemInfo,
                unSaved: action.payload.unSaved
            };
        case SYSTEM_INFO_LOADING:
            return {
                ...state,
                loadingState: LoadingState.Loading
            };
        case SYSTEM_INFO_ERROR:
            return {
                ...state,
                loadingState: LoadingState.Error
            };
        case TEST_CONNECTION_LOADING:
            return {
                ...state,
                testConnectionLoadingState: LoadingState.Loading
            };
        case TEST_CONNECTION_STATUS:
            return {
                ...state,
                connectionStatus: action.payload.connectionStatus,
                guidedAnswerLink: action.payload.guidedAnswerLink,
                testConnectionLoadingState: LoadingState.Idle
            };
        case UPDATE_SYSTEM_STATUS:
            return {
                ...state,
                updateSystemStatus: action.payload
            };
        case CREATE_NEW_SYSTEM:
            return {
                ...state,
                addNewSapSystem: true
            };
        default:
            return state;
    }
};
