import { DefinitionRegistry, QuickActionActivationContext, QuickActionDefinitionGroup } from '../quick-action-definition';

import { ToggleClearFilterBarQuickAction } from './lr-toggle-clear-filter-bar';
import { AddControllerToPageQuickAction } from '../common/add-controller-to-page';
import { QuickActionDefinitionRegistry } from '../registry';

const FE_V4_QUICK_ACTION_DEFINITION_REGISTRY: DefinitionRegistry = {
    listPage: [ToggleClearFilterBarQuickAction, AddControllerToPageQuickAction],
    objectPage: []
};

export default class  FEV4QuickActionRegistry extends QuickActionDefinitionRegistry {
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        return [
            // {
            //     title: 'List Page',
            //     definitions: FE_V4_QUICK_ACTION_DEFINITION_REGISTRY.listPage,
            //     key: 
            // }
        ];
    }
}
