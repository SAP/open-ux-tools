import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';

import { DialogFactory, DialogNames } from '../../dialog-factory';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const OP_ADD_CUSTOM_SECTION = 'op-add-custom-section';
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a Header Field to an Object Page.
 */
export class AddCustomSectionQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(OP_ADD_CUSTOM_SECTION, CONTROL_TYPES, 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async execute(): Promise<FlexCommand[]> {
        const objectPageLayout = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )[0] as ObjectPageLayout;

        const overlay = OverlayRegistry.getOverlay(objectPageLayout) || [];
        await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
            aggregation: 'sections',
            title: 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION'
        });
        return [];
    }
}
