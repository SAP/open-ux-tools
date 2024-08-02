import VersionInfo from 'sap/ui/VersionInfo';
/** sap.ui.fl */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { DialogNames, handler, isControllerExtensionEnabled } from '../../../../adp/init-dialogs';
import { getExistingController } from '../../../../adp/api-handler';

import { getAllSyncViewsIds, getControllerInfo } from '../../../utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../quick-action-definition';

import { getCurrentActivePages, getRelevantControlFromActivePage, pageHasControlId } from '../../utils';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

export class AddControllerToPageQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ADD_CONTROLLER_TO_PAGE_TYPE;
    isActive = false;
    controllerExists = false;
    constructor(private context: QuickActionContext) {}

    async initialize() {
        const activePages = getCurrentActivePages(this.context.controlIndex);
        for (const activePage of activePages) {
            for (const controlName of CONTROL_TYPES) {
                const controls = this.context.controlIndex[controlName] || [];
                for (const ctrl of controls) {
                    const isActionApplicable = pageHasControlId(activePage, ctrl.controlId);
                    if (!isActionApplicable) {
                        continue;
                    }
                    const controlObj = sap.ui.getCore().byId(ctrl.controlId);
                    if (controlObj) {
                        const { version } = (await VersionInfo.load()) as { version: string };
                        const versionParts = version.split('.');
                        const minor = parseInt(versionParts[1], 10);
                        const syncViewsIds = await getAllSyncViewsIds(minor);
                        const overlay = OverlayRegistry.getOverlay(controlObj) || [];
                        const controlInfo = getControllerInfo(overlay);
                        try {
                            const data = await getExistingController(controlInfo.controllerName);
                            this.isActive = isControllerExtensionEnabled([overlay], syncViewsIds, minor);
                            this.controllerExists = data?.controllerExists;
                        } catch (e) {
                            this.isActive = false;
                        }
                    }
                }
            }
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            type: this.type,
            enabled: this.isActive,
            // TODO: translate this?
            title: this.controllerExists ? 'Show page Controller' : 'Add Controller to page'
        };
    }

    async execute(): Promise<FlexCommand[]> {
        const activePages = getCurrentActivePages(this.context.controlIndex);
        for (const activePage of activePages) {
            for (const control of getRelevantControlFromActivePage(this.context, activePage, CONTROL_TYPES)) {
                const overlay = OverlayRegistry.getOverlay(control) || [];
                await handler(overlay, this.context.rta, DialogNames.CONTROLLER_EXTENSION);
            }
        }

        return [];
    }
}
