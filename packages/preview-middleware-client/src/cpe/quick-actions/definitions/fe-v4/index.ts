import { QuickActionDefinition, QuickActionDefinitionConstructor } from '../quick-action-definition';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { AddControllerToPageQuickAction } from './add-controller-to-page';
import { ChangeTableColumnsQuickAction } from './change-table-columns';

export const FE_V4_QUICK_ACTION_DEFINITIONS: QuickActionDefinitionConstructor<QuickActionDefinition>[] = [
    ToggleClearFilterBarQuickAction,
    AddControllerToPageQuickAction,
    ChangeTableColumnsQuickAction
];
