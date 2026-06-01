import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { getUi5Version } from '../../../utils/version.js';
import { getControllerInfoForControl, getReuseComponentChecker, checkForExistingChange } from '../../utils.js';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils.js';
import type {
    QuickActionContext,
    SimpleQuickActionDefinition
} from '../../../cpe/quick-actions/quick-action-definition.js';
import { getTextBundle } from '../../../i18n.js';
import { getExistingController } from '../../api-handler.js';
import { DialogFactory, DialogNames } from '../../dialog-factory.js';
import { isControllerExtensionEnabledForControl } from '../../init-dialogs.js';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator.js';
import type { EnablementValidatorResult } from '../enablement-validator.js';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base.js';

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
        super(ADD_CONTROLLER_TO_PAGE_TYPE, CONTROL_TYPES, '', context, [
            DIALOG_ENABLEMENT_VALIDATOR,
            {
                run: async (): Promise<EnablementValidatorResult> => {
                    const controllerName = getControllerInfoForControl(this.context.view).controllerName;
                    const i18n = await getTextBundle();
                    if (
                        checkForExistingChange(this.context.rta, 'codeExt', 'selector.controllerName', controllerName)
                    ) {
                        return {
                            type: 'error',
                            message: i18n.getText('ADP_QUICK_ACTION_CONTROLLER_PENDING_CHANGE_EXISTS')
                        };
                    }
                }
            }
        ]);
    }

    private controllerExists = false;
    forceRefreshAfterExecution = true;

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        const isReuseComponent = await getReuseComponentChecker(version);

        const control = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )[0];
        if (control) {
            const controlInfo = getControllerInfoForControl(control);
            const data = await getExistingController(controlInfo.controllerName);
            this.controllerExists = data?.controllerExists;
            const isActiveAction = isControllerExtensionEnabledForControl(
                control,
                isReuseComponent,
                this.context.flexSettings.isCloud
            );
            this.control = isActiveAction ? control : undefined;
        }
    }

    protected get textKey() {
        return this.controllerExists ? 'QUICK_ACTION_SHOW_PAGE_CONTROLLER' : 'QUICK_ACTION_ADD_PAGE_CONTROLLER';
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await DialogFactory.createDialog(
                overlay,
                this.context.rta,
                DialogNames.CONTROLLER_EXTENSION,
                undefined,
                {},
                { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
            );
        }
        return [];
    }
}
