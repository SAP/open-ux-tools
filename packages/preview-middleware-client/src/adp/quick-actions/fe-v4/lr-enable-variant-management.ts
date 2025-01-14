import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import Component from 'sap/ui/core/Component';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { createManifestPropertyChange } from '../../../utils/fe-v4';

export const ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS = 'enable-variant-management-in-tables-charts';

const CONTROL_TYPES = ['sap.f.DynamicPage']; //, 'sap.uxap.ObjectPageLayout','sap.f.DynamicPage'

type ListReportComponent = Component & {
    getVariantManagement: () => string;
};

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableListReportVariantManagementQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    private pageSmartVariantManagementMode = '';
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
                            this.pageSmartVariantManagementMode = (
                                ownerComponent as unknown as ListReportComponent
                            ).getVariantManagement();
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
        super.initialize();
    }

    async execute(): Promise<FlexCommand[]> {
        if (!this.control) {
            return [];
        }
        const { flexSettings } = this.context;
        // const ownerComponent = Component.getOwnerComponentFor(this.control);
        // const entitySet = (ownerComponent as unknown as ListReportComponent).getEntitySet();
        // const command = await prepareManifestChange(
        //     this.context,
        //     'component/settings',
        //     this.control,
        //     COMPONENT,
        //     entitySet,
        //     {
        //         smartVariantManagement: true,
        //         variantManagementHidden: this.pageSmartVariantManagementMode
        //     }
        // );

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
