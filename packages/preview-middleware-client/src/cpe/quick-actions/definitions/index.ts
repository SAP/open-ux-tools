import { ENABLE_CLEAR_FILTER_BAR } from './lr-enable-clear-filter-bar';
import { ADD_FIELD_TO_HEADER } from './op-add-field-to-header';
import { ADD_PAGE_CONTROLLER } from './page-add-controller';
import { QuickActionDefinition } from './quick-action-definition';
import { RENAME_SECTION } from './rename-section-title';

export type AnyQuickActionDefinition = QuickActionDefinition<boolean> | QuickActionDefinition<undefined>;

export const QUICK_ACTION_DEFINITIONS: AnyQuickActionDefinition[] = [
    ENABLE_CLEAR_FILTER_BAR,
    ADD_FIELD_TO_HEADER,
    ADD_PAGE_CONTROLLER,
    RENAME_SECTION
];
