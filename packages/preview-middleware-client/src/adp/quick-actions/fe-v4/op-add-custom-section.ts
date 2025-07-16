import { getV4AppComponent } from '../../../utils/fe-v4';
import { PageDescriptorV4 } from '../../controllers/AddCustomFragment.controller';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { OP_ADD_CUSTOM_SECTION } from '../common/op-add-custom-section';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { DialogFactory, DialogNames } from '../../dialog-factory';

const OP_PAGE_LAYOUT = ['sap.uxap.ObjectPageLayout'];

interface ViewDataType {
    stableId: string;
}
/**
 * Quick Action for adding a custom page action.
 */
export class AddCustomSectionQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    protected get currentPageDescriptor(): PageDescriptorV4 {
        const appComponent = getV4AppComponent(this.context.view);
        const projectId = this.context.flexSettings.projectId;
        const objectPageLayout = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            OP_PAGE_LAYOUT
        )[0] as ObjectPageLayout;
        const sections = objectPageLayout.getSections();
        let anchor: string | null = null;
        const pageId = (this.context.view.getViewData() as ViewDataType)?.stableId.split('::').pop() as string;
        if (sections.length > 0) {
            // Use the first section as the anchor if available
            anchor = (this.context.view.getLocalId(sections[sections.length - 1].getId()) ?? '')
                .split('::')
                .pop() as string;
        }
        if (!pageId) {
            throw new Error('pageId is not defined');
        }
        if (!projectId) {
            throw new Error('app reference is not defined');
        }
        if (!appComponent) {
            throw new Error('appComponent is not defined');
        }
        if (!anchor) {
            throw new Error('appComponent is not defined');
        }
        return {
            appType: 'fe-v4',
            appComponent,
            anchor,
            pageId,
            projectId
        };
    }
    constructor(context: QuickActionContext) {
        super(OP_ADD_CUSTOM_SECTION, OP_PAGE_LAYOUT, 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async execute(): Promise<FlexCommand[]> {
        const objectPageLayout = getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            OP_PAGE_LAYOUT
        )[0] as ObjectPageLayout;

        const overlay = OverlayRegistry.getOverlay(objectPageLayout) || [];
        await DialogFactory.createDialog(
            overlay,
            this.context.rta,
            DialogNames.ADD_CUSTOM_FRAGMENT,
            undefined,
            {
                propertyPath: 'content/body/sections/',
                title: 'QUICK_ACTION_OP_ADD_CUSTOM_SECTION',
                appDescriptor: this.currentPageDescriptor
            },
            { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
        );
        return [];
    }
}
