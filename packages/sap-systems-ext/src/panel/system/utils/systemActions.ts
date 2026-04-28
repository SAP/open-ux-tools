import type {
    SystemInfoLoading,
    CreateNewSystem,
    UpdateSystemStatus,
    SystemInfo,
    TestConnectionLoading,
    TestConnectionStatus
} from '@sap-ux/sap-systems-ext-types';
import type { BackendSystem } from '@sap-ux/store';

export const systemInfoLoading = (): SystemInfoLoading => ({
    type: 'SYSTEM_INFO_LOADING'
});

export const createNewSystem = (systemInfo?: BackendSystem): CreateNewSystem => ({
    type: 'CREATE_NEW_SYSTEM',
    ...(systemInfo && { payload: { systemInfo } })
});

export const updateSystemInfo = (payload: SystemInfo['payload']): SystemInfo => ({
    type: 'SYSTEM_INFO',
    payload
});

export const updateSystemStatus = (payload: UpdateSystemStatus['payload']): UpdateSystemStatus => ({
    type: 'UPDATE_SYSTEM_STATUS',
    payload
});

export const loadingTestConnectionInfo = (): TestConnectionLoading => ({
    type: 'TEST_CONNECTION_LOADING'
});

export const connectionStatusMsg = (payload: TestConnectionStatus['payload']): TestConnectionStatus => ({
    type: 'TEST_CONNECTION_STATUS',
    payload
});
