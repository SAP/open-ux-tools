import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import FlexBox from 'sap/m/FlexBox';

import { DialogNames, handler } from '../../../adp/init-dialogs';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { isA } from '../../../utils/core';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const OP_ADD_HEADER_FIELD_TYPE = 'op-add-header-field';
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a Header Field to an Object Page.
 */
export class AddHeaderFieldQuickAction extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(OP_ADD_HEADER_FIELD_TYPE, CONTROL_TYPES, 'QUICK_ACTION_OP_ADD_HEADER_FIELD', context);
    }

    async execute(): Promise<FlexCommand[]> {
        const objectPageLayout = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )[0] as ObjectPageLayout;

        const headerContent = objectPageLayout.getHeaderContent();

        // check if only flex box exist in the headerContent.
        if (headerContent.length === 1 && isA<FlexBox>('sap.m.FlexBox', headerContent[0])) {
            const overlay = OverlayRegistry.getOverlay(headerContent[0]) || [];
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'items',
                title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD'
            });
        } else if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'headerContent',
                title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD'
            });
        }
        return [];
    }
}
