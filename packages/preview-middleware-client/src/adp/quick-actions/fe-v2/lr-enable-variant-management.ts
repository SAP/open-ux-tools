import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type ListReportComponent from 'sap/suite/ui/generic/template/ListReport/Component';
import type AnalyticalListComponent from 'sap/suite/ui/generic/template/AnalyticalListPage/Component';
import Component from 'sap/ui/core/Component';

import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { areManifestChangesSupported, prepareManifestChange } from './utils';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';

export const ENABLE_VARIANT_MANAGEMENT_IN_TABLES_CHARTS = 'enable-variant-management-in-tables-charts';

const CONTROL_TYPES = ['sap.f.DynamicPage'];

/**
 * Quick Action for enabling table filtering using table personalization settings.
 */
export class EnableListReportVariantManagementQuickAction
    extends SimpleQuickActionDefinitionBase
    implements SimpleQuickActionDefinition
{
    private isPageSmartVariantManagementEnabled = false;
    private ownerComponent: ListReportComponent | AnalyticalListComponent;
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
                        if (this.ownerComponent && !this.isPageSmartVariantManagementEnabled) {
                            return {
                                type: 'error',
                                message: this.context.resourceBundle.getText(
                                    'VARIANT_MANAGEMENT_FOR_PAGE_CONTROLS_IS_ALREADY_ENABLED'
                                )
                            };
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
        await super.initialize();
        if (this.control) {
            const ownerComponent = Component.getOwnerComponentFor(this.control);
            if (
                ownerComponent?.isA<ListReportComponent>('sap.suite.ui.generic.template.ListReport.Component') ||
                ownerComponent?.isA<AnalyticalListComponent>(
                    'sap.suite.ui.generic.template.AnalyticalListPage.Component'
                )
            ) {
                this.ownerComponent = ownerComponent;
                const id = this.control.getId();
                if (typeof id !== 'string') {
                    throw new Error('Could not retrieve configuration property because control id is not valid!');
                }
                const value = this.context.changeService.getConfigurationPropertyValue(id, 'smartVariantManagement');
                this.isPageSmartVariantManagementEnabled =
                    value === undefined ? this.ownerComponent.getSmartVariantManagement() : (value as boolean);
            } else {
                this.control = undefined;
            }
        }
    }

    async execute(): Promise<FlexCommand[]> {
        if (!this.control) {
            return [];
        }

        const entitySet = this.ownerComponent.getEntitySet();
        const command = await prepareManifestChange(
            this.context,
            'component/settings',
            this.control,
            this.ownerComponent.getMetadata().getComponentName(),
            entitySet,
            {
                smartVariantManagement: !this.isPageSmartVariantManagementEnabled
            }
        );

        return command;
    }
}
