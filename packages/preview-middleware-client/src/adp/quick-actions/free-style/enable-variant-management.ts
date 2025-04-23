import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import Component from 'sap/ui/core/Component';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { createManifestPropertyChange } from '../../../utils/fe-v4';
import ListReportComponent from 'sap/suite/ui/generic/template/ListReport';

export const ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS = 'enable-variant-management-in-tables-charts';

// sap.f.DynamicPage for list report and sap.uxap.ObjectPageLayout for object page.
const CONTROL_TYPES = ['sap.f.DynamicPage', 'sap.uxap.ObjectPageLayout'];

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableVariantManagementQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    private pageSmartVariantManagementMode = '';
    private ownerComponent: ListReportComponent;
    constructor(context: QuickActionContext) {
        super(
            ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS,
            CONTROL_TYPES,
            'QUICK_ACTION_ENABLE_TABLES_AND_CHARTS_VARIANT_MANAGEMENT',
            context,
            [
                {
                    run: () => {
                        if (this.control) {
                            if (this.pageSmartVariantManagementMode === 'Control') {
                                return {
                                    type: 'error',
                                    message: this.context.resourceBundle.getText(
                                        'VARIANT_MANAGEMENT_FOR_PAGE_CONTROLS_IS_ALREADY_ENABLED'
                                    )
                                };
                            }
                        }
                        return undefined;
                    }
                }
            ]
        );
    }

    readonly forceRefreshAfterExecution = true;
    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 131 })) {
            return;
        }
        await super.initialize();
        if (this.control) {
            this.ownerComponent = Component.getOwnerComponentFor(this.control) as unknown as ListReportComponent;
            if (
                !this.ownerComponent?.isA('sap.fe.templates.ListReport.Component') &&
                !this.ownerComponent?.isA('sap.fe.templates.ObjectPage.Component') &&
                !this.ownerComponent?.isA('sap.fe.templates.AnalyticalListPage.Component')
            ) {
                this.control = undefined;
            } else {
                const id = this.control.getId();
                if (typeof id !== 'string') {
                    throw new Error('Could not retrieve configuration property because control id is not valid!');
                }
                const value = this.context.changeService.getConfigurationPropertyValue(id, 'variantManagement');
                this.pageSmartVariantManagementMode =
                    value === undefined ? this.ownerComponent.getVariantManagement() : (value as string);
            }
        }
    }

    async execute(): Promise<FlexCommand[]> {
        if (!this.control) {
            return [];
        }
        const { flexSettings } = this.context;

        const command = await createManifestPropertyChange(this.control, flexSettings, {
            variantManagement: 'Control'
        });
        if (command) {
            return [command];
        } else {
            return [];
        }
    }
}
