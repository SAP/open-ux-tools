import { FE_V2_QUICK_ACTION_DEFINITIONS } from './fe-v2/index';
import { FE_V4_QUICK_ACTION_DEFINITIONS } from './fe-v4/index';

import { QuickActionDefinition, QuickActionDefinitionConstructor } from './quick-action-definition';

export const QUICK_ACTION_DEFINITIONS = (
    feVersion: 'v2' | 'v4' | undefined
): QuickActionDefinitionConstructor<QuickActionDefinition>[] => {
    const quickAction =
        feVersion === 'v2' ? FE_V2_QUICK_ACTION_DEFINITIONS : feVersion === 'v4' ? FE_V4_QUICK_ACTION_DEFINITIONS : [];
    return quickAction;
};
