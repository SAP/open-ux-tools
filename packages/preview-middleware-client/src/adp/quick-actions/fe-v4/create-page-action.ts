import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { DialogFactory, DialogNames } from '../../dialog-factory';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { getExistingController } from '../../api-handler';
import { getControllerInfoForControl } from '../../utils';
import { getV4AppComponent } from '../../../utils/fe-v4';
import { isA } from '../../../utils/core';
import DynamicPageTitle from 'sap/f/DynamicPageTitle';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import ObjectPageDynamicHeaderTitle from 'sap/uxap/ObjectPageDynamicHeaderTitle';

export const ADD_PAGE_ACTION = 'add-page-action';
const CONTROL_TYPES = ['sap.f.DynamicPageTitle', 'sap.uxap.ObjectPageLayout'];
interface ViewDataType {
    stableId: string;
}
/**
 * Quick Action for adding a custom page action.
 */
export class AddPageActionQuickAction extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    protected pageId: string | undefined;
    constructor(context: QuickActionContext) {
        super(ADD_PAGE_ACTION, CONTROL_TYPES, 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async initialize(): Promise<void> {
        this.pageId = (this.context.view.getViewData() as ViewDataType)?.stableId.split('::').pop() as string;
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 96 })) {
            return;
        }
        await super.initialize();
    }

    async execute(): Promise<FlexCommand[]> {
        if (this.control) {
            const overlay = OverlayRegistry.getOverlay(this.control) || [];
            const controlInfo = getControllerInfoForControl(this.control);
            const data = await getExistingController(controlInfo.controllerName);
            const controllerPath = data.controllerPathFromRoot.replace(/\//g, '.').replace(/\.[^.]+$/, '');
            await DialogFactory.createDialog(
                overlay,
                this.context.rta,
                DialogNames.ADD_ACTION,
                undefined,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_PAGE_ACTION',
                    controllerReference: controllerPath
                        ? `.extension.${controllerPath}.<REPLACE_WITH_YOUR_HANDLER_NAME>`
                        : '', //this.context.controllerReference,
                    appDescriptor: {
                        appComponent: getV4AppComponent(this.context.view)!,
                        appType: 'fe-v4',
                        pageId: this.pageId!,
                        projectId: this.context.flexSettings.projectId
                    },
                    validateActionId: (actionId) => {
                        if (
                            isA('sap.f.DynamicPageTitle', this.control) &&
                            (this.control as DynamicPageTitle)
                                .getActions()
                                .every((action) => !action.getId().endsWith(`fe::CustomAction::${actionId}`))
                        ) {
                            return true;
                        }
                        if (
                            isA('sap.uxap.ObjectPageLayout', this.control) &&
                            ((this.control as ObjectPageLayout)
                                .getHeaderTitle() as ObjectPageDynamicHeaderTitle)?.getActions()
                                .every((action) => !action.getId().endsWith(`fe::CustomAction::${actionId}`))
                        ) {
                            return true;
                        }
                        return false;
                    },
                    propertyPath: 'content/header/actions/'
                },
                { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
            );
        }
        return [];
    }
}
