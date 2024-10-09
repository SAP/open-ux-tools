import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { getUi5Version } from '../../../utils/version';
import { getAllSyncViewsIds, getControllerInfoForControl } from '../../utils';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import type {
    QuickActionContext,
    SimpleQuickActionDefinition
} from '../../../cpe/quick-actions/quick-action-definition';
import { DialogNames, handler, isControllerExtensionEnabledForControl } from '../../init-dialogs';
import { getExistingController } from '../../api-handler';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ADD_CONTROLLER_TO_PAGE_TYPE = 'add-controller-to-page';
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding controller to a page.
 */
export class AddControllerToPageQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(ADD_CONTROLLER_TO_PAGE_TYPE, CONTROL_TYPES, '', context);
    }

    private controllerExists = false;

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
            this.controllerExists = data?.controllerExists;
            const isActiveAction = isControllerExtensionEnabledForControl(control, syncViewsIds, version);
            this.control = isActiveAction ? control : undefined;
            break;
        }
    }

    protected get textKey() {
        return this.controllerExists ? 'QUICK_ACTION_SHOW_PAGE_CONTROLLER' : 'QUICK_ACTION_ADD_PAGE_CONTROLLER';
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await handler(overlay, this.context.rta, DialogNames.CONTROLLER_EXTENSION);
        }
        return [];
    }
}
