import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import FlexBox from 'sap/m/FlexBox';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { DialogNames, handler } from '../../../adp/init-dialogs';

import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { isA } from '../../../utils/core';
export const OP_ADD_HEADER_FIELD_TYPE = 'op-add-header-field';
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a Header Field to an Object Page.
 */
export class AddHeaderFieldQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = OP_ADD_HEADER_FIELD_TYPE;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    isActive = false;
    private control: UI5Element | undefined;
    constructor(private context: QuickActionContext) {}

    initialize(): void {
        for (const control of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            this.isActive = true;
            this.control = control;
            break;
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText('QUICK_ACTION_OP_ADD_HEADER_FIELD')
        };
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
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, 'items');
        } else if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, 'headerContent');
        }
        return [];
    }
}
