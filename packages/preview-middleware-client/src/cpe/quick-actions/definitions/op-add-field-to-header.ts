import { getFEAppPagesMap, isPageContainsControlById } from '../../rta-service';
import { ActivationContext, ExecutionContext, QuickActionDefinition } from './quick-action-definition';

export const ADD_FIELD_TO_HEADER_TYPE = 'add-field-to-header';
const ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const CONTROL_TYPE = 'sap.uxap.ObjectPageDynamicHeaderTitle';

export const ADD_FIELD_TO_HEADER: QuickActionDefinition = {
    type: ADD_FIELD_TO_HEADER_TYPE,
    title: 'Add Field to Header',
    isActive: (context: ActivationContext): boolean => {
        const controls = context.controlIndex[CONTROL_TYPE];

        if (controls?.length === 1) {
            const pages = getFEAppPagesMap(context.rta);
            const control = controls[0];
            const isActionApplicable = Object.keys(pages).some(
                (key) =>
                    key.split('.').pop() === 'ObjectPage' &&
                    !pages[key].isInvisible &&
                    isPageContainsControlById(pages[key].page, control.controlId)
            );

            if (!isActionApplicable) {
                return false;
            }

            return !!control;
        }
        return false;
    },
    execute: async (context: ExecutionContext): Promise<void> => {
        const controls = context.controlIndex[CONTROL_TYPE];
        if (controls?.length === 1) {
            const control = controls[0];
            await (context.actionService as any).execute(control.controlId, ACTION_ID);
        }
    }
};
