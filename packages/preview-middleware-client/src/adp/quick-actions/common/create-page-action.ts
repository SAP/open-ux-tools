import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { DialogFactory, DialogNames } from '../../dialog-factory';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { ApplicationType, getApplicationType } from '../../../utils/application';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const ADD_PAGE_ACTION = 'add-page-action';
const CONTROL_TYPES = ['sap.f.DynamicPageTitle', 'sap.uxap.ObjectPageHeader', 'sap.uxap.ObjectPageDynamicHeaderTitle'];

/**
 * Quick Action for adding a custom page action.
 */
export class AddPageActionQuickAction extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    private readonly appType: ApplicationType;
    constructor(context: QuickActionContext) {
        super(ADD_PAGE_ACTION, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
        this.appType = getApplicationType(this.context.rta.getRootControlInstance().getManifest());
    }

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (this.appType === 'fe-v4' && isLowerThanMinimalUi5Version(version, { major: 1, minor: 130 })) {
            return;
        }
        await super.initialize();
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            await DialogFactory.createDialog(overlay, this.context.rta, DialogNames.ADD_FRAGMENT, undefined, {
                aggregation: 'actions',
                title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION',
                defaultAggregationArrayIndex: 1
            });
        }
        return [];
    }
}
