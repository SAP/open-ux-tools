import { ENABLE_SEMANTIC_DATE } from './filterbar-enable-semantic-date';
import { ENABLE_CLEAR_FILTER_BAR } from './lr-enable-clear-filter-bar';
import { ADD_FIELD_TO_HEADER } from './op-add-field-to-header';
import { ADD_PAGE_CONTROLLER } from './page_add_controller';
import { QuickActionDefinition } from './quick-action-definition';
import { RENAME_SECTION } from './rename-section-title';

export const QUICK_ACTION_DEFINITIONS: QuickActionDefinition[] = [
    ENABLE_CLEAR_FILTER_BAR,
    ADD_FIELD_TO_HEADER,
    // ENABLE_SEMANTIC_DATE,
    ADD_PAGE_CONTROLLER,
    RENAME_SECTION
];
