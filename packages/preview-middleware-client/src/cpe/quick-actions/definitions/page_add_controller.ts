import { ActivationContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';
import VersionInfo from 'sap/ui/VersionInfo';
import UI5Element from 'sap/ui/dt/Element';
import ElementOverlay from 'sap/ui/dt/ElementOverlay';
/** sap.ui.fl */
import Utils from 'sap/ui/fl/Utils';
import { isReuseComponent } from '../../outline/utils';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogNames, handler, isControllerExtensionEnabled } from '../../../adp/init-dialogs';
import { getExistingController } from '../../../adp/api-handler';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
// const ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const CONTROL_TYPE = ['sap.f.DynamicPage'];

export const ADD_PAGE_CONTROLLER: QuickActionDefinition = {
    type: ADD_CONTROLLER_TO_PAGE_TYPE,
    title: 'Add Controller to page',
    isActive: async (context: ActivationContext): Promise<boolean> => {
        const controlName = CONTROL_TYPE.find((type) => context.controlIndex[type]);
        if (controlName) {
            const { version } = (await VersionInfo.load()) as { version: string };
            const versionParts = version.split('.');
            const minor = parseInt(versionParts[1], 10);
            const syncViewsIds = await getAllSyncViewsIds(minor);
            const component = context.controlIndex[controlName][0];
            const control = sap.ui.getCore().byId(component.controlId);
            const overlay = OverlayRegistry.getOverlay(control!) || [];
            let data;
            try {
                const controlInfo = getControllerInfo(overlay);
                data = await getExistingController(controlInfo.controllerName);
            } catch (e) {}
            return isControllerExtensionEnabled([overlay], syncViewsIds, minor) && !data?.controllerExists;
        }
        return false;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const controlName = CONTROL_TYPE.find((type) => context.controlIndex[type]);
        if (controlName) {
            const component = context.controlIndex[controlName][0];
            const control = sap.ui.getCore().byId(component.controlId);
            const overlay = OverlayRegistry.getOverlay(control!) || [];
            handler(overlay, context.rta, DialogNames.CONTROLLER_EXTENSION);
        }
    }
};

async function getAllSyncViewsIds(minor: number): Promise<string[]> {
    const syncViewIds: string[] = [];
    try {
        if (minor < 120) {
            const Element = (await import('sap/ui/core/Element')).default;
            const elements = Element.registry.filter(() => true) as UI5Element[];
            elements.forEach((ui5Element) => {
                if (isSyncView(ui5Element)) {
                    syncViewIds.push(ui5Element.getId());
                }
            });
        } else {
            const ElementRegistry = (await import('sap/ui/core/ElementRegistry')).default;
            const elements = ElementRegistry.all() as Record<string, UI5Element>;
            Object.entries(elements).forEach(([key, ui5Element]) => {
                if (isSyncView(ui5Element)) {
                    syncViewIds.push(key);
                }
            });
        }
    } catch (error) {}

    return syncViewIds;
}

/**
 * Check if element is sync view
 *
 * @param element UI5Element
 * @returns boolean if element is sync view or not
 */
const isSyncView = (element: UI5Element): boolean => {
    return element?.getMetadata()?.getName()?.includes('XMLView') && element?.oAsyncState === undefined;
};

// /**
//  * Handler for enablement of Extend With Controller context menu entry
//  *
//  * @param overlays Control overlays
//  * @param syncViewsIds Runtime Authoring
//  * @param minorUI5Version minor UI5 version
//  *
//  * @returns boolean whether menu item is enabled or not
//  */
// export const isControllerExtensionEnabled = (
//     overlays: ElementOverlay[],
//     syncViewsIds: string[],
//     minorUI5Version: number
// ): boolean => {
//     if (overlays.length === 0 || overlays.length > 1) {
//         return false;
//     }

//     const clickedControlId = FlUtils.getViewForControl(overlays[0].getElement()).getId();
//     const isClickedControlReuseComponent = isReuseComponent(clickedControlId, minorUI5Version);

//     return !syncViewsIds.includes(clickedControlId) && !isClickedControlReuseComponent;
// };

function getControllerInfo(overlayControl: ElementOverlay): {
    controllerName: string;
    viewId: string;
} {
    const control = overlayControl.getElement();
    const view = Utils.getViewForControl(control);
    const controllerName = view.getController().getMetadata().getName();
    const viewId = view.getId();
    return { controllerName, viewId };
}
