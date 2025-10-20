import type { IActionCalloutDetail } from '@sap-ux/ui-components';
import type { ConnectionStatus, UpdateSystemStatus } from '@sap-ux/sap-systems-ext-types';
import type { BackendSystem } from '@sap-ux/store';

export enum LoadingState {
    Idle = 'idle',
    Loading = 'loading',
    Error = 'error'
}
export interface SystemState {
    systemInfo?: BackendSystem;
    unSaved?: boolean;
    loadingState?: LoadingState;
    testConnectionLoadingState?: LoadingState;
    connectionStatus?: ConnectionStatus;
    updateSystemStatus?: UpdateSystemStatus['payload'];
    addNewSapSystem?: boolean;
    guidedAnswerLink?: IActionCalloutDetail;
}

export interface VsCodeApi {
    postMessage: (message: any) => {};
}
