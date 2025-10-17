import type { PanelContext } from '../../../types/system';
import { getBackendSystemType, type BackendSystem } from '@sap-ux/store';
import { SystemPanelViewType } from '../../../utils/constants';
import { createNewSystem, systemInfoLoading, updateSystemInfo, updateSystemStatus } from '../utils';

/**
 * Renders the webview based on the panel context.
 *
 * @param context - panel context
 */
export async function renderWebApp(context: PanelContext): Promise<void> {
    const { backendSystem, panelViewType, systemStatusMessage, postMessage } = context;
    const systemInfo = getSystemInfo(backendSystem);

    await postMessage(systemInfoLoading());

    // open view for creating new system
    if (panelViewType === SystemPanelViewType.Create) {
        await postMessage(createNewSystem());
        return;
    }

    // view the existing saved system
    if (systemInfo && panelViewType === SystemPanelViewType.View) {
        await postMessage(updateSystemInfo({ systemInfo, unSaved: true }));
        if (systemStatusMessage) {
            await postMessage(updateSystemStatus({ message: systemStatusMessage, updateSuccess: true }));
        }
        return;
    }

    // view the imported system
    if (systemInfo && panelViewType === SystemPanelViewType.Import) {
        await postMessage(updateSystemInfo({ systemInfo, unSaved: true }));
        return;
    }
}

/**
 * Retrieves the backend system with the correct system type.
 *
 * @param backendSystem - backend system
 * @returns backend sysem with correct system type
 */
function getSystemInfo(backendSystem?: BackendSystem): BackendSystem | undefined {
    let systemInfo: BackendSystem | undefined;
    if (backendSystem) {
        systemInfo = { ...backendSystem, systemType: getBackendSystemType(backendSystem) ?? 'OnPrem' }; // fallback to OnPrem so that system info can be displayed
    }
    return systemInfo;
}
