import { getTextBundle } from '../../i18n';

import { DialogFactory } from '../dialog-factory';

import type { EnablementValidator, EnablementValidatorResult } from './enablement-validator';

export const DIALOG_ENABLEMENT_VALIDATOR: EnablementValidator = {
    run: async (): Promise<EnablementValidatorResult> => {
        const i18n = await getTextBundle();
        if (!DialogFactory.canOpenDialog) {
            return {
                type: 'error',
                message: i18n.getText('ADP_QUICK_ACTION_DIALOG_OPEN_MESSAGE')
            };
        }
        return undefined;
    }
};
