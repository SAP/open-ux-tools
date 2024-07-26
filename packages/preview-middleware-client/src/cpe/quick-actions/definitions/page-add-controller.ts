import {
    ActivationContext,
    ExecutionContext,
    QuickActionActivationData,
    QuickActionDefinition
} from './quick-action-definition';
import VersionInfo from 'sap/ui/VersionInfo';
/** sap.ui.fl */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler, isControllerExtensionEnabled } from '../../../adp/init-dialogs';
import { getExistingController } from '../../../adp/api-handler';
import { getCurrentActivePage, getRelevantControlFromActivePage } from './utils';
import { getAllSyncViewsIds, getControllerInfo } from '../../utils';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

export const ADD_PAGE_CONTROLLER: QuickActionDefinition<undefined> = {
    type: ADD_CONTROLLER_TO_PAGE_TYPE,
    getActivationData: async (context: ActivationContext): Promise<QuickActionActivationData> => {
        const result: QuickActionActivationData = { isActive: false, title: '' };
        const activePages = getCurrentActivePage(context);
        for (const activePage of activePages) {
            for (const control of getRelevantControlFromActivePage(context, activePage, CONTROL_TYPES)) {
                const { version } = (await VersionInfo.load()) as { version: string };
                const versionParts = version.split('.');
                const minor = parseInt(versionParts[1], 10);
                const syncViewsIds = await getAllSyncViewsIds(minor);
                const overlay = OverlayRegistry.getOverlay(control) || [];
                let data;
                try {
                    const controlInfo = getControllerInfo(overlay);
                    data = await getExistingController(controlInfo.controllerName);
                    result.isActive = isControllerExtensionEnabled([overlay], syncViewsIds, minor);
                    result.title = data?.controllerExists ? 'Show page Controller' : 'Add Controller to page';
                    return result;
                } catch (e) {}
            }
        }
        return result;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const activePages = getCurrentActivePage(context);
        for (const activePage of activePages) {
            for (const control of getRelevantControlFromActivePage(context, activePage, CONTROL_TYPES)) {
                const overlay = OverlayRegistry.getOverlay(control) || [];
                await handler(overlay, context.rta, DialogNames.CONTROLLER_EXTENSION);
            }
        }
    }
};
