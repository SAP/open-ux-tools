import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { getFEAppPagesMap, isPageContainsControlById } from '../../../rta-service';

import { QuickActionContext, SimpleQuickActionDefinition } from '../quick-action-definition';

export const ADD_FIELD_TO_HEADER_TYPE = 'add-field-to-header';
const ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
// Eg: adp.fe no ObjectPageDynamicHeaderTitle
// fe.v2.lrop.customer ObjectPageDynamicHeaderTitle exists
const CONTROL_TYPES = ['sap.uxap.ObjectPageDynamicHeaderTitle', 'sap.uxap.ObjectPageHeader'];

export class AddFieldToHeaderQuickAction implements SimpleQuickActionDefinition {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    readonly type = ADD_FIELD_TO_HEADER_TYPE;
    isActive = false;
    isClearButtonEnabled = false;
    constructor(private context: QuickActionContext) {}

    initialize(): void {
        const controlName = CONTROL_TYPES.find((type) => this.context.controlIndex[type]);
        if (controlName) {
            const pages = getFEAppPagesMap(this.context.rta);
            const control = this.context.controlIndex[controlName][0];
            const isActionApplicable =
                control &&
                Object.keys(pages).some(
                    (key) =>
                        key.split('.').pop() === 'ObjectPage' &&
                        !pages[key][0].isInvisible &&
                        isPageContainsControlById(pages[key][0].page, control.controlId)
                );

            this.isActive = isActionApplicable;
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            type: this.type,
            enabled: this.isActive,
            // TODO: translate this?
            title: 'Add Field to Header'
        };
    }

    async execute(): Promise<FlexCommand[]> {
        const controlName = CONTROL_TYPES.find((type) => this.context.controlIndex[type]);
        if (controlName) {
            const control = this.context.controlIndex[controlName][0];
            await this.context.actionService.execute(control.controlId, ACTION_ID);
        }
        return [];
    }
}
