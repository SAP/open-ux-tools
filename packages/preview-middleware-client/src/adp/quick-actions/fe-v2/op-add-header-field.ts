import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { DialogNames, handler } from '../../../adp/init-dialogs';

import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
export const OP_ADD_HEADER_FIELD_TYPE = 'op-add-header-field';
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

export class AddHeaderFieldQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = OP_ADD_HEADER_FIELD_TYPE;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    isActive = false;
    private control: UI5Element | undefined;
    constructor(private context: QuickActionContext) {}

    initialize() {
        // TODO: handle different page layouts.
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
        const key = 'Add Header Field';
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText(key) ?? key
        };
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, 'headerContent');
        }
        return [];
    }
}
