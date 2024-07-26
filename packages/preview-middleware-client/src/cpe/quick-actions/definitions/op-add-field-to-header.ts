import { getFEAppPagesMap, isPageContainsControlById } from '../../rta-service';
import {
    ActivationContext,
    ExecutionContext,
    QuickActionActivationData,
    QuickActionDefinition
} from './quick-action-definition';

export const ADD_FIELD_TO_HEADER_TYPE = 'add-field-to-header';
const ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
// Eg: adp.fe no ObjectPageDynamicHeaderTitle
// fe.v2.lrop.customer ObjectPageDynamicHeaderTitle exists
const CONTROL_TYPES = ['sap.uxap.ObjectPageDynamicHeaderTitle', 'sap.uxap.ObjectPageHeader'];

export const ADD_FIELD_TO_HEADER: QuickActionDefinition<undefined> = {
    type: ADD_FIELD_TO_HEADER_TYPE,
    getActivationData: (context: ActivationContext): QuickActionActivationData => {
        const result: QuickActionActivationData = { isActive: false, title: 'Add Field to Header' };
        const controlName = CONTROL_TYPES.find((type) => context.controlIndex[type]);
        if (controlName) {
            const pages = getFEAppPagesMap(context.rta);
            const control = context.controlIndex[controlName][0];
            const isActionApplicable =
                control &&
                Object.keys(pages).some(
                    (key) =>
                        key.split('.').pop() === 'ObjectPage' &&
                        !pages[key][0].isInvisible &&
                        isPageContainsControlById(pages[key][0].page, control.controlId)
                );

            result.isActive = isActionApplicable;
        }
        return result;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const controlName = CONTROL_TYPES.find((type) => context.controlIndex[type]);
        if (controlName) {
            const control = context.controlIndex[controlName][0];
            await context.actionService?.execute(control.controlId, ACTION_ID);
        }
    }
};
