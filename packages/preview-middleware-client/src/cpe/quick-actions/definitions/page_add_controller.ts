import { ActivationContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';
import VersionInfo from 'sap/ui/VersionInfo';
import UI5Element from 'sap/ui/dt/Element';
/** sap.ui.fl */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler, isControllerExtensionEnabled } from '../../../adp/init-dialogs';
import { getExistingController } from '../../../adp/api-handler';
import { getCurrentActivePage, getRelevantControlFromActivePage } from './utils';
import { getAllSyncViewsIds, getControllerInfo } from '../../utils';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

export const ADD_PAGE_CONTROLLER: QuickActionDefinition = {
    type: ADD_CONTROLLER_TO_PAGE_TYPE,
    getTitle: (): string => {
        return 'Add Controller to page';
    },
    isActive: async (context: ActivationContext): Promise<boolean> => {
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
                } catch (e) {}
                return isControllerExtensionEnabled([overlay], syncViewsIds, minor) && !data?.controllerExists;
            }
        }
        return false;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const activePages = getCurrentActivePage(context);
        for (const activePage of activePages) {
            for (const control of getRelevantControlFromActivePage(context, activePage, CONTROL_TYPES)) {
                const overlay = OverlayRegistry.getOverlay(control) || [];
                handler(overlay, context.rta, DialogNames.CONTROLLER_EXTENSION);
            }
        }
    }
};
