import type { PanelContext } from '../../../types/system';
import { SystemPanelViewType } from '../../../utils/constants';
import { createNewSystem, systemInfoLoading, updateSystemInfo, updateSystemStatus } from '../utils';

/**
 * Renders the webview based on the panel context.
 *
 * @param context - panel context
 */
export async function renderWebApp(context: PanelContext): Promise<void> {
    const { backendSystem, panelViewType, systemStatusMessage, postMessage } = context;

    await postMessage(systemInfoLoading());

    // open view for creating new system
    if (panelViewType === SystemPanelViewType.Create) {
        await postMessage(createNewSystem());
        return;
    }

    // view the existing saved system
    if (backendSystem && panelViewType === SystemPanelViewType.View) {
        await postMessage(updateSystemInfo({ systemInfo: backendSystem, unSaved: false }));
        if (systemStatusMessage) {
            await postMessage(updateSystemStatus({ message: systemStatusMessage, updateSuccess: true }));
        }
        return;
    }

    // view the imported system
    if (backendSystem && panelViewType === SystemPanelViewType.Import) {
        await postMessage(updateSystemInfo({ systemInfo: backendSystem, unSaved: true }));
        return;
    }
}
