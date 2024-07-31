import { FE_V2_QUICK_ACTION_DEFINITIONS } from './fe-v2/index';

import { QuickActionDefinition, QuickActionDefinitionConstructor } from './quick-action-definition';


export const QUICK_ACTION_DEFINITIONS: QuickActionDefinitionConstructor<QuickActionDefinition>[] = [
    ...FE_V2_QUICK_ACTION_DEFINITIONS
];
