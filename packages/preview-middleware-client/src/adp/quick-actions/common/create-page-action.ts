import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { DialogNames, handler } from '../../init-dialogs';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { getApplicationType } from '../../../utils/application';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';

export const ADD_PAGE_ACTION = 'add-page-action';
const CONTROL_TYPES = ['sap.f.DynamicPageTitle', 'sap.uxap.ObjectPageHeader', 'sap.uxap.ObjectPageDynamicHeaderTitle'];

/**
 * Quick Action for adding a custom page action.
 */
export class AddPageActionQuickAction extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    constructor(context: QuickActionContext) {
        super(ADD_PAGE_ACTION, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION', context);
    }

    async initialize(): Promise<void> {
        const appType = getApplicationType(this.context.rta.getRootControlInstance().getManifest());
        const version = await getUi5Version();
        if (appType === 'fe-v4' && isLowerThanMinimalUi5Version(version, { major: 1, minor: 130 })) {
            return;
        }
        return super.initialize();
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await handler(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'actions',
                title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION'
            });
        }
        return [];
    }
}
