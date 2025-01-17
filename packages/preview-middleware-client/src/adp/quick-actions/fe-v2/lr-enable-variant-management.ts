import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { areManifestChangesSupported, prepareManifestChange } from './utils';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import Component from 'sap/ui/core/Component';

export const ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS = 'enable-variant-management-in-tables-charts';

const CONTROL_TYPES = ['sap.f.DynamicPage']; //, 'sap.uxap.ObjectPageLayout'

type ListReportComponent = Component & {
    getSmartVariantManagement: () => boolean;
    getEntitySet: () => string;
};

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableListReportVariantManagementQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    private isPageSmartVariantManagementEnabled = false;
    readonly forceRefreshAfterExecution = true;

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
                            const ownerComponent = Component.getOwnerComponentFor(this.control);
                            this.isPageSmartVariantManagementEnabled = (
                                ownerComponent as unknown as ListReportComponent
                            ).getSmartVariantManagement();
                            if (!this.isPageSmartVariantManagementEnabled) {
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

    async initialize(): Promise<void> {
        const manifestChangesSupported = await areManifestChangesSupported(this.context.manifest);
        if (!manifestChangesSupported) {
            return;
        }
        super.initialize();
    }

    async execute(): Promise<FlexCommand[]> {
        if (!this.control) {
            return [];
        }
        const ownerComponent = Component.getOwnerComponentFor(this.control);
        const entitySet = (ownerComponent as unknown as ListReportComponent).getEntitySet();
        const command = await prepareManifestChange(
            this.context,
            'component/settings',
            this.control,
            (ownerComponent as unknown as ListReportComponent).getMetadata().getComponentName(),
            entitySet,
            {
                smartVariantManagement: !this.isPageSmartVariantManagementEnabled
            }
        );

        return command;
    }
}
