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

const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const SETTINGS_ID = 'CTX_SETTINGS';
const ICON_TAB_BAR_TYPE = 'sap.m.IconTabBar';
export const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
export const M_TABLE_TYPE = 'sap.m.Table';
export const MDC_TABLE_TYPE = 'sap.ui.mdc.Table';
export const TREE_TABLE_TYPE = 'sap.ui.table.TreeTable';
export const GRID_TABLE_TYPE = 'sap.ui.table.Table';
export const ANALYTICAL_TABLE_TYPE = 'sap.ui.table.AnalyticalTable';

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

/**
 * Base class for table quick actions.
 */
export abstract class TableQuickActionDefinitionBase {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    public isApplicable = false;

    protected isDisabled: boolean | undefined;


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
        protected includeServiceAction?: boolean
    ) { }

    /**
     * Initializes action object instance
     * 
     * @param onAddChild - Optional callback executed when a child element is added to update tooltip adn enable property.
     */
    async initialize(onAddChild?: (table: UI5Element, child: NestedQuickActionChild) => void): Promise<void> {
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
                this.collectChildrenInSection(section, table, onAddChild);
            } else if (this.iconTabBar && tabKey) {
                this.children.push({
                    label: `'${iconTabBarfilterMap[tabKey]}' table`,
                    enabled: true,
                    children: []
                });
                if (onAddChild) {
                    onAddChild(table, this.children[this.children.length - 1]);
                }
                this.tableMap[`${this.children.length - 1}`] = {
                    table,
                    iconTabBarFilterKey: tabKey,
                    tableUpdateEventAttachedOnce: false
                };
            } else {
                this.processTable(table);
            }

            // add action id to the table map, if the service actions are needed.
            if (this.includeServiceAction) {
                const actions = await this.context.actionService.get(table.getId());
                const actionsIds = await getActionId(table);

                const changeColumnAction = actionsIds.find(
                    (actionId) => actions.findIndex((action) => action.id === actionId) > -1
                );
                Object.keys(this.tableMap).forEach((key) => {
                    // Update the changeColumnActionId for each entry
                    this.tableMap[key].changeColumnActionId = changeColumnAction;
                });
            }
        }
        if (this.children.length > 0) {
            this.isApplicable = true;
        }
    }


    /**
     * Retrieves the internal table from a UI5Element and checks if it contains rows.
     *
     * @param table - The UI5Element instance to analyze.
     * @returns The internal table otherwise undefined.
     */
    public getInternalTable(table: UI5Element): UI5Element | undefined {
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
    public getTableLabel(table: UI5Element): string {
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
    private buildIconTabBarFilterMap(): { [key: string]: string } {
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
     * @param onAddChild - Optional callback executed when a child element is added to update tooltip adn enable property.
     */
    private collectChildrenInSection(section: ObjectPageSection, table: UI5Element, onAddChild?: (table: UI5Element, child: NestedQuickActionChild) => void): void {
        const layout = getParentContainer<ObjectPageLayout>(table, 'sap.uxap.ObjectPageLayout');
        const subSections = section.getSubSections();
        const subSection = getParentContainer<ObjectPageSubSection>(table, 'sap.uxap.ObjectPageSubSection');
        if (subSection) {
            if (subSections?.length === 1) {
                this.processTable(table, { section, subSection: subSections[0], layout }, onAddChild);
            } else if (subSections.length > 1) {
                const sectionChild = this.children.find((val) => val.label === `${section.getTitle()} section`);
                let tableMapIndex = `${this.children.length - 1}`;
                if (!sectionChild) {
                    tableMapIndex = `${tableMapIndex}/0`;
                    this.children.push({
                        label: `'${section?.getTitle()}' section`,
                        enabled: true,
                        children: [
                            {
                                label: this.getTableLabel(table),
                                enabled: true,
                                children: []
                            }
                        ]
                    });
                    if (onAddChild) {
                        onAddChild(table, this.children[this.children.length - 1]);
                    }
                } else {
                    tableMapIndex = `${tableMapIndex}/${sectionChild.children.length - 1}`;
                    sectionChild.children.push({
                        label: this.getTableLabel(table),
                        enabled: true,
                        children: []
                    });
                    if (onAddChild) {
                        onAddChild(table, this.children[this.children.length - 1]);
                    }
                }

                this.tableMap[tableMapIndex] = {
                    table,
                    sectionInfo: { section, subSection, layout },
                    tableUpdateEventAttachedOnce: false
                };
            }
        }
    }

    /**
     * Processes table element and pushes table data to the children array
     * @param table - table element
     * @param sectionInfo - section info object
     * @param onAddChild - Optional callback executed when a child element is added to update tooltip adn enable property.
     */
    private processTable(
        table: UI5Element,
        sectionInfo?: { section: ObjectPageSection; subSection: ObjectPageSubSection; layout?: ObjectPageLayout },
        onAddChild?: (table: UI5Element, child: NestedQuickActionChild) => void
    ): void {
        if ([SMART_TABLE_TYPE, M_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE].some((type) => isA(type, table))) {
            this.children.push({
                label: this.getTableLabel(table),
                enabled: true,
                children: []
            });
            if (onAddChild) {
                onAddChild(table, this.children[this.children.length - 1]);
            }
        }

        this.tableMap[`${this.children.length - 1}`] = {
            table,
            sectionInfo: sectionInfo,
            tableUpdateEventAttachedOnce: false
        };
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
            title: this.context.resourceBundle.getText(this.textKey),
            children: this.children
        };
    }


    /**
     * Initializes custom table actions.
     * 
     * @param table - table control.
     * @param child - custom column quick action properties. 
     */
    protected initializeCustomColumnTable(table: UI5Element, child: NestedQuickActionChild): void {
        const innerTable = this.getInternalTable(table);
        const tableRows = innerTable?.getAggregation('items') as ManagedObject[] | [];
        if (isA(M_TABLE_TYPE, innerTable) && (!tableRows || tableRows.length === 0)) {
            child.enabled = false;
            child.tooltip = this.context.resourceBundle.getText('TABLE_CUSTOM_COLUMN_ACTION_NOT_AVAILABLE');
        }
    }

}
