import { QuickActionDefinition, QuickActionDefinitionConstructor } from '../quick-action-definition';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { AddFieldToHeaderQuickAction } from './op-add-field-to-header';
import { AddControllerToPageQuickAction } from './add-controller-to-page';
import { RenameSectionQuickAction } from './rename-section-title';

export const FE_V2_QUICK_ACTION_DEFINITIONS: QuickActionDefinitionConstructor<QuickActionDefinition>[] = [
    ToggleClearFilterBarQuickAction,
    AddControllerToPageQuickAction,
    RenameSectionQuickAction,
    AddFieldToHeaderQuickAction
];
