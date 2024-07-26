import { getFEAppPagesMap, isPageContainsControlById } from '../../rta-service';
import { ActivationContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';

export const ADD_FIELD_TO_HEADER_TYPE = 'add-field-to-header';
const ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
// Eg: adp.fe no ObjectPageDynamicHeaderTitle
// fe.v2.lrop.customer ObjectPageDynamicHeaderTitle exists
const CONTROL_TYPES = ['sap.uxap.ObjectPageDynamicHeaderTitle', 'sap.uxap.ObjectPageHeader'];

export const ADD_FIELD_TO_HEADER: QuickActionDefinition = {
    type: ADD_FIELD_TO_HEADER_TYPE,
    getTitle: (): string => {
        return 'Add Field to Header';
    },
    isActive: (context: ActivationContext): boolean => {
        const controlName = CONTROL_TYPES.find((type) => context.controlIndex[type]);

        if (controlName) {
            const pages = getFEAppPagesMap(context.rta);
            const control = context.controlIndex[controlName][0];
            const isActionApplicable = Object.keys(pages).some(
                (key) =>
                    key.split('.').pop() === 'ObjectPage' &&
                    !pages[key][0].isInvisible &&
                    isPageContainsControlById(pages[key][0].page, control.controlId)
            );

            if (!isActionApplicable) {
                return false;
            }

            return !!control;
        }
        return false;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const controlName = CONTROL_TYPES.find((type) => context.controlIndex[type]);
        if (controlName) {
            const control = context.controlIndex[controlName][0];
            await (context.actionService as any).execute(control.controlId, ACTION_ID);
        }
    }
};
