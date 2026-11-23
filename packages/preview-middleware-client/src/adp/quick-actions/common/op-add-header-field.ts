import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import type FlexBox from 'sap/m/FlexBox';

import { DialogFactory, DialogNames } from '../../dialog-factory.js';
import type {
    QuickActionContext,
    SimpleQuickActionDefinition
} from '../../../cpe/quick-actions/quick-action-definition.js';
import { isA } from '../../../utils/core.js';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base.js';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator.js';
import type { EnablementValidatorResult } from '../enablement-validator.js';
import { getTextBundle } from '../../../i18n.js';

export const OP_ADD_HEADER_FIELD_TYPE = 'op-add-header-field';
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a Header Field to an Object Page.
 */
export class AddHeaderFieldQuickAction
    extends SimpleQuickActionDefinitionBase<ObjectPageLayout>
    implements SimpleQuickActionDefinition
{
    constructor(context: QuickActionContext) {
        super(OP_ADD_HEADER_FIELD_TYPE, CONTROL_TYPES, 'QUICK_ACTION_OP_ADD_HEADER_FIELD', context, [
            DIALOG_ENABLEMENT_VALIDATOR,
            {
                run: async (): Promise<EnablementValidatorResult> => {
                    const i18n = await getTextBundle();
                    if (!this.control?.getShowHeaderContent()) {
                        return {
                            type: 'error',
                            message: i18n.getText('DISABLE_SHOW_HEADER_CONTENT')
                        };
                    }
                    return undefined;
                }
            }
        ]);
    }

    async execute(): Promise<FlexCommand[]> {
        if (!this.control) {
            return [];
        }
        const headerContent = this.control.getHeaderContent();

        // check if only flex box exist in the headerContent.
        if (headerContent.length === 1 && isA<FlexBox>('sap.m.FlexBox', headerContent[0])) {
            const overlay = OverlayRegistry.getOverlay(headerContent[0]) || [];
            await DialogFactory.createDialog(
                overlay,
                this.context.rta,
                DialogNames.ADD_FRAGMENT,
                undefined,
                {
                    aggregation: 'items',
                    title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD'
                },
                { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
            );
        } else if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await DialogFactory.createDialog(
                overlay,
                this.context.rta,
                DialogNames.ADD_FRAGMENT,
                undefined,
                {
                    aggregation: 'headerContent',
                    title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD'
                },
                { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
            );
        }
        return [];
    }
}
