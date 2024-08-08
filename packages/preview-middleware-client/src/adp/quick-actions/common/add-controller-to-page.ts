import VersionInfo from 'sap/ui/VersionInfo';
/** sap.ui.fl */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { getAllSyncViewsIds, getControllerInfoForControl, isControllerExtensionEnabledForControl } from '../../../cpe/utils';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';

import { DialogNames, handler } from '../../init-dialogs';
import { getExistingController } from '../../api-handler';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

export class AddControllerToPageQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ADD_CONTROLLER_TO_PAGE_TYPE;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    isActive = false;
    private controllerExists = false;
    private control: UI5Element | undefined;
    constructor(private context: QuickActionContext) {}

    async initialize() {
        for (const control of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            // TODO: use new version utility function 
            const { version } = (await VersionInfo.load()) as { version: string };
            const versionParts = version.split('.');
            const minor = parseInt(versionParts[1], 10);
            const syncViewsIds = await getAllSyncViewsIds(minor);
            const controlInfo = getControllerInfoForControl(control);
            const data = await getExistingController(controlInfo.controllerName);
            this.isActive = isControllerExtensionEnabledForControl(control, syncViewsIds, minor);
            this.controllerExists = data?.controllerExists;
            this.control = control;
            break;
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            // TODO: translate this?
            title: this.controllerExists ? 'Show page controller' : 'Add controller to page'
        };
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await handler(overlay, this.context.rta, DialogNames.CONTROLLER_EXTENSION);
        }
        return [];
    }
}
