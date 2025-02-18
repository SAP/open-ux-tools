import UI5Element from 'sap/ui/core/Element';
import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import type IconTabBar from 'sap/m/IconTabBar';
import type IconTabFilter from 'sap/m/IconTabFilter';
import type Table from 'sap/m/Table';
import type MdcTable from 'sap/ui/mdc/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import { QuickActionContext } from '../../cpe/quick-actions/quick-action-definition';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import type { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { getParentContainer, getRelevantControlFromActivePage } from '../../cpe/quick-actions/utils';
import { getControlById, isA, isManagedObject } from '../../utils/core';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../utils/version';
import ObjectPageSection from 'sap/uxap/ObjectPageSection';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
import ManagedObject from 'sap/ui/base/ManagedObject';
import { EnablementValidator } from './enablement-validator';
import { QuickActionDefinitionBase } from './quick-action-base';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    M_TABLE_TYPE,
    MDC_TABLE_TYPE,
    SMART_TABLE_TYPE,
    TREE_TABLE_TYPE
} from './control-types';

const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const SETTINGS_ID = 'CTX_SETTINGS';
const ICON_TAB_BAR_TYPE = 'sap.m.IconTabBar';

async function getActionId(table: UI5Element): Promise<string[]> {
    const { major, minor } = await getUi5Version();

    if (isA(SMART_TABLE_TYPE, table)) {
        if (major === 1 && minor === 96) {
            return [SETTINGS_ID];
        } else {
            return [SMART_TABLE_ACTION_ID];
        }
    }

    return [M_TABLE_ACTION_ID, SETTINGS_ID];
}
export type TableQuickActionsOptions = {
    includeServiceAction?: boolean;
    areTableRowsRequired?: boolean;
};

/**
 * Base class for table quick actions.
 */
export abstract class TableQuickActionDefinitionBase extends QuickActionDefinitionBase<
    typeof NESTED_QUICK_ACTION_KIND
> {
    public isApplicable = false;

    public children: NestedQuickActionChild[] = [];
    public tableMap: Record<
        string,
        {
            table: UI5Element;
            tableUpdateEventAttachedOnce: boolean;
            iconTabBarFilterKey?: string;
            changeColumnActionId?: string;
            sectionInfo?: {
                section: ObjectPageSection;
                subSection: ObjectPageSubSection;
                layout?: ObjectPageLayout;
            };
        }
    > = {};
    public iconTabBar: IconTabBar | undefined;

    protected get textKey(): string {
        return this.defaultTextKey;
    }

    protected control: UI5Element | undefined;

    constructor(
        public readonly type: string,
        protected readonly controlTypes: string[],
        protected readonly defaultTextKey: string,
        protected readonly context: QuickActionContext,
        protected options: TableQuickActionsOptions = {},
        protected readonly enablementValidators: EnablementValidator[] = []
    ) {
        super(type, NESTED_QUICK_ACTION_KIND, defaultTextKey, context, enablementValidators);
    }

    /**
     * Adds action id to the table map entry, if the service actions are needed.
     * @param table - table element
     * @param tableMapKey - map key
     */
    protected async addSettingsActionId(table: UI5Element, tableMapKey: string): Promise<void> {
        if (this.options.includeServiceAction) {
            const actions = await this.context.actionService.get(table.getId());
            const actionsIds = await getActionId(table);

            const changeColumnAction = actionsIds.find(
                (actionId) => actions.findIndex((action) => action.id === actionId) > -1
            );
            this.tableMap[tableMapKey].changeColumnActionId = changeColumnAction;
        }
    }

    /**
     * Initializes action object instance
     */
    async initialize(): Promise<void> {
        // No action found in control design time for version < 1.96
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 96 })) {
            this.isApplicable = false;
            return;
        }
        const iconTabBarfilterMap = this.buildIconTabBarFilterMap();
        for (const table of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            this.controlTypes
        )) {
            const tabKey = Object.keys(iconTabBarfilterMap).find((key) => table.getId().endsWith(key));
            const section = getParentContainer<ObjectPageSection>(table, 'sap.uxap.ObjectPageSection');
            if (section) {
                await this.collectChildrenInSection(section, table);
            } else if (this.iconTabBar && tabKey) {
                const label = `'${iconTabBarfilterMap[tabKey]}' table`;
                const child = this.createChild(label, table);
                this.children.push(child);
                const tableMapKey = `${this.children.length - 1}`;
                this.tableMap[tableMapKey] = {
                    table,
                    iconTabBarFilterKey: tabKey,
                    tableUpdateEventAttachedOnce: false
                };
                await this.addSettingsActionId(table, tableMapKey);
            } else {
                await this.processTable(table);
            }
        }
        if (this.children.length > 0) {
            this.isApplicable = true;
        }
    }

    /**
     * Retrieves the internal table control from a UI5Element.
     *
     * @param table - The UI5Element instance to analyze.
     * @returns The internal table otherwise undefined.
     */
    protected getInternalTable(table: UI5Element): UI5Element | undefined {
        try {
            let tableInternal: ManagedObject | undefined;

            if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
                const itemsAggregation = table.getAggregation('items') as ManagedObject[];
                tableInternal = itemsAggregation.find((item) =>
                    [M_TABLE_TYPE, TREE_TABLE_TYPE, ANALYTICAL_TABLE_TYPE, GRID_TABLE_TYPE].some((tType) =>
                        isA(tType, item)
                    )
                );
            }
            return tableInternal as UI5Element | undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Determines table label for the given table element
     * @param table - table element
     * @returns table label if found or 'Unnamed table'
     */
    private getTableLabel(table: UI5Element): string {
        if (isA<SmartTable>(SMART_TABLE_TYPE, table) || isA<MdcTable>(MDC_TABLE_TYPE, table)) {
            const header = table.getHeader();
            if (header) {
                return `'${header}' table`;
            }
        } else if (isA<Table>(M_TABLE_TYPE, table)) {
            const tilte = table?.getHeaderToolbar()?.getTitleControl()?.getText();
            if (tilte) {
                return `'${tilte}' table`;
            }
        }

        return 'Unnamed table';
    }

    /**
     * Builds a map kay/tab_name for ICON_TAB_BAR control of the active page, if such exists
     * @returns built map
     */
    protected buildIconTabBarFilterMap(): { [key: string]: string } {
        const iconTabBarFilterMap: { [key: string]: string } = {};

        // Assumption only a tab bar control per page.
        const tabBar = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            ICON_TAB_BAR_TYPE
        ])[0];
        if (tabBar) {
            const control = getControlById(tabBar.getId());
            if (isA<IconTabBar>(ICON_TAB_BAR_TYPE, control)) {
                this.iconTabBar = control;
                for (const item of control.getItems()) {
                    if (isManagedObject(item) && isA<IconTabFilter>('sap.m.IconTabFilter', item)) {
                        iconTabBarFilterMap[item.getKey()] = item.getText();
                    }
                }
            }
        }

        return iconTabBarFilterMap;
    }

    /**
     * Collects subsection data in the table map for the given section and table
     * @param section - object page section
     * @param table - table element
     */
    private async collectChildrenInSection(section: ObjectPageSection, table: UI5Element): Promise<void> {
        const layout = getParentContainer<ObjectPageLayout>(table, 'sap.uxap.ObjectPageLayout');
        const subSections = section.getSubSections();
        const subSection = getParentContainer<ObjectPageSubSection>(table, 'sap.uxap.ObjectPageSubSection');
        if (subSection) {
            if (subSections?.length === 1) {
                await this.processTable(table, { section, subSection: subSections[0], layout });
            } else if (subSections.length > 1) {
                const existingChildIdx = this.children.findIndex(
                    (val) => val.label === `'${section.getTitle()}' section`
                );
                let tableMapIndex;
                const label = this.getTableLabel(table);
                const child = this.createChild(label, table);
                if (existingChildIdx < 0) {
                    this.children.push({
                        label: `'${section?.getTitle()}' section`,
                        enabled: true,
                        children: [child]
                    });

                    tableMapIndex = `${this.children.length - 1}/0`;
                } else {
                    this.children[existingChildIdx].children.push(child);
                    tableMapIndex = `${existingChildIdx.toFixed(0)}/${
                        this.children[existingChildIdx].children.length - 1
                    }`;
                }

                this.tableMap[tableMapIndex] = {
                    table,
                    sectionInfo: { section, subSection, layout },
                    tableUpdateEventAttachedOnce: false
                };
                await this.addSettingsActionId(table, tableMapIndex);
            }
        }
    }

    /**
     * Processes table element and pushes table data to the children array
     * @param table - table element
     * @param sectionInfo - section info object
     */
    private async processTable(
        table: UI5Element,
        sectionInfo?: { section: ObjectPageSection; subSection: ObjectPageSubSection; layout?: ObjectPageLayout }
    ): Promise<void> {
        if (
            [
                SMART_TABLE_TYPE,
                M_TABLE_TYPE,
                MDC_TABLE_TYPE,
                TREE_TABLE_TYPE,
                GRID_TABLE_TYPE,
                ANALYTICAL_TABLE_TYPE
            ].some((type) => isA(type, table))
        ) {
            const label = this.getTableLabel(table);
            const child = this.createChild(label, table);
            this.children.push(child);
        }

        const tableMapKey = `${this.children.length - 1}`;
        this.tableMap[tableMapKey] = {
            table,
            sectionInfo: sectionInfo,
            tableUpdateEventAttachedOnce: false
        };
        await this.addSettingsActionId(table, tableMapKey);
    }

    /**
     * Selects closest overlay for the given table element
     * @param table - table element
     */
    protected selectOverlay(table: UI5Element): void {
        const controlOverlay = OverlayUtil.getClosestOverlayFor(table);
        if (controlOverlay) {
            controlOverlay.setSelected(true);
        }
    }

    /**
     * Prepares nested quick action object
     * @returns action instance
     */
    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: !this.isDisabled,
            tooltip: this.tooltip,
            title: this.context.resourceBundle.getText(this.textKey),
            children: this.children
        };
    }

    createChild(label: string, table: UI5Element): NestedQuickActionChild {
        const child: NestedQuickActionChild = {
            label,
            enabled: true,
            children: []
        };
        if (!this.options.areTableRowsRequired) {
            return child;
        }
        const innerTable = this.getInternalTable(table);
        const tableRows = (innerTable?.getAggregation('items') as ManagedObject[]) || [];
        if (isA(M_TABLE_TYPE, innerTable) && !tableRows.length) {
            child.enabled = false;
            child.tooltip = this.context.resourceBundle.getText('TABLE_CUSTOM_COLUMN_ACTION_NOT_AVAILABLE');
        }
        return child;
    }
}
