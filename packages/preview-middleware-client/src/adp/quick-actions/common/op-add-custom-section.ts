import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { DialogNames, handler } from '../../init-dialogs';

import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
export const OP_ADD_CUSTOM_SECTION = 'op-add-custom-section';
const CONTROL_TYPES = ['sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for adding a Header Field to an Object Page.
 */
export class AddCustomSectionQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = OP_ADD_CUSTOM_SECTION;
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
            title: this.context.resourceBundle.getText('QUICK_ACTION_OP_ADD_CUSTOM_SECTION')
        };
    }

    async execute(): Promise<FlexCommand[]> {
        const objectPageLayout = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )[0] as ObjectPageLayout;

        const overlay = OverlayRegistry.getOverlay(objectPageLayout) || [];
        await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, 'sections');
        return [];
    }
}
