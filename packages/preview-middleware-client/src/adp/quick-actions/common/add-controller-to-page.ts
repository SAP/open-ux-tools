import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { getUi5Version } from '../../../utils/version';
import { getAllSyncViewsIds, getControllerInfoForControl } from '../../utils';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import type {
    QuickActionContext,
    SimpleQuickActionDefinition
} from '../../../cpe/quick-actions/quick-action-definition';

import { DialogNames, handler, isControllerExtensionEnabledForControl } from '../../init-dialogs';
import { getExistingController } from '../../api-handler';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];


/**
 * Quick Action for adding controller to a page.
 */
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

    async initialize(): Promise<void> {
        for (const control of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            const version = await getUi5Version();
            const syncViewsIds = await getAllSyncViewsIds(version);
            const controlInfo = getControllerInfoForControl(control);
            const data = await getExistingController(controlInfo.controllerName);
            this.isActive = isControllerExtensionEnabledForControl(control, syncViewsIds, version);
            this.controllerExists = data?.controllerExists;
            this.control = control;
            break;
        }
    }

    getActionObject(): SimpleQuickAction {
        const key = this.controllerExists ? 'QUICK_ACTION_SHOW_PAGE_CONTROLLER' : 'QUICK_ACTION_ADD_PAGE_CONTROLLER';
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText(key)
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
