import type { BackendSystem } from '@sap-ux/store';
import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import type { ConnectionStatus } from '../system';

/**
 * Actions fired from the extension host to the webview.
 */
export type ExtensionActions =
    | CreateNewSystem
    | SystemInfo
    | SystemInfoLoading
    | SystemInfoError
    | TestConnectionLoading
    | TestConnectionStatus
    | UpdateSystemStatus;

export const CREATE_NEW_SYSTEM = 'CREATE_NEW_SYSTEM' as const;
export const SYSTEM_INFO = 'SYSTEM_INFO' as const;
export const SYSTEM_INFO_LOADING = 'SYSTEM_INFO_LOADING' as const;
export const SYSTEM_INFO_ERROR = 'SYSTEM_INFO_ERROR' as const;
export const TEST_CONNECTION_STATUS = 'TEST_CONNECTION_STATUS' as const;
export const TEST_CONNECTION_LOADING = 'TEST_CONNECTION_LOADING' as const;
export const UPDATE_SYSTEM_STATUS = 'UPDATE_SYSTEM_STATUS' as const;

export interface CreateNewSystem {
    type: typeof CREATE_NEW_SYSTEM;
}

export interface SystemInfo {
    type: typeof SYSTEM_INFO;
    payload: { systemInfo: BackendSystem; unSaved: boolean };
}

export interface SystemInfoLoading {
    type: typeof SYSTEM_INFO_LOADING;
}

export interface SystemInfoError {
    type: typeof SYSTEM_INFO_ERROR;
}

export interface TestConnectionLoading {
    type: typeof TEST_CONNECTION_LOADING;
}

export interface TestConnectionStatus {
    type: typeof TEST_CONNECTION_STATUS;
    payload: {
        connectionStatus: ConnectionStatus;
        guidedAnswerLink?: IActionCalloutDetail;
    };
}

export interface UpdateSystemStatus {
    type: typeof UPDATE_SYSTEM_STATUS;
    payload: { message: string; updateSuccess: boolean };
}
