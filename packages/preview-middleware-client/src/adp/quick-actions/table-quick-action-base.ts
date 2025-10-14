import UI5Element from 'sap/ui/core/Element';
import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import type IconTabBar from 'sap/m/IconTabBar';
import { QuickActionContext } from '../../cpe/quick-actions/quick-action-definition';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import type { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { getParentContainer, getRelevantControlFromActivePage } from '../../cpe/quick-actions/utils';
import { getControlById, isA, isManagedObject } from '../../utils/core';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../utils/version';
import ObjectPageSection from 'sap/uxap/ObjectPageSection';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';
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
import { isVariantManagementEnabledOPPage } from './fe-v2/utils';
const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const SETTINGS_ID = 'CTX_SETTINGS';
const REARRANGE_TOOLBAR_SETTINGS_ID = 'CTX_SETTINGS0';
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

async function getRearrangeToolbarContentActionId(): Promise<string> {
    const { major, minor } = await getUi5Version();
    if (major === 1 && minor <= 127) {
        return SETTINGS_ID;
    }
    return REARRANGE_TOOLBAR_SETTINGS_ID;
}

export type TableQuickActionsOptions = {
    includeServiceAction?: boolean;
    areTableRowsRequired?: boolean;
    validatePageVariantManagement?: boolean;
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
            changeToolbarContentAction?: { id: string; enabled: boolean };
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
            const changeColumnActionId = actionsIds.find(
                (actionId) => actions.findIndex((action) => action.id === actionId) > -1
            );
            this.tableMap[tableMapKey].changeColumnActionId = changeColumnActionId;
            const changeToolbarContentActionId = await getRearrangeToolbarContentActionId();
            const changeToolbarContentAction = actions.find((action) => action.id === changeToolbarContentActionId);
            this.tableMap[tableMapKey].changeToolbarContentAction = changeToolbarContentAction
                ? {
                      id: changeToolbarContentAction.id,
                      enabled: changeToolbarContentAction.enabled
                  }
                : undefined;
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
            const section = getParentContainer(table, 'sap.uxap.ObjectPageSection');
            if (section) {
                await this.collectChildrenInSection(section, table);
            } else if (this.iconTabBar && tabKey) {
                const label = `'${iconTabBarfilterMap[tabKey]}' table`;
                const tableMapKey = this.children.length.toString();
                const child = this.createChild(label, table, tableMapKey);
                this.children.push(child);
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
            if (!isA(SMART_TABLE_TYPE, table)) {
                return undefined;
            }

            const itemsAggregation = table.getAggregation('items');
            if (!Array.isArray(itemsAggregation)) {
                return undefined;
            }

            for (const item of itemsAggregation) {
                if (
                    isA(M_TABLE_TYPE, item) ||
                    isA(TREE_TABLE_TYPE, item) ||
                    isA(ANALYTICAL_TABLE_TYPE, item) ||
                    isA(GRID_TABLE_TYPE, item)
                ) {
                    return item;
                }
            }

            return undefined;
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
        if (isA(SMART_TABLE_TYPE, table) || isA(MDC_TABLE_TYPE, table)) {
            const header = table.getHeader();
            if (header) {
                return `'${header}' table`;
            }
        } else if (isA(M_TABLE_TYPE, table)) {
            const title = table?.getHeaderToolbar()?.getTitleControl()?.getText();
            if (title) {
                return `'${title}' table`;
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
            if (isA(ICON_TAB_BAR_TYPE, control)) {
                this.iconTabBar = control;
                for (const item of control.getItems()) {
                    if (isManagedObject(item) && isA('sap.m.IconTabFilter', item)) {
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
        const layout = getParentContainer(table, 'sap.uxap.ObjectPageLayout');
        const subSections = section.getSubSections();
        const subSection = getParentContainer(table, 'sap.uxap.ObjectPageSubSection');
        if (subSection) {
            if (subSections?.length === 1) {
                await this.processTable(table, { section, subSection: subSections[0], layout });
            } else if (subSections.length > 1) {
                const existingChildIdx = this.children.findIndex(
                    (val) => val.label === `'${section.getTitle()}' section`
                );
                let tableMapIndex;
                const label = this.getTableLabel(table);
                if (existingChildIdx < 0) {
                    tableMapIndex = `${this.children.length}/0`;
                    const child = this.createChild(label, table, tableMapIndex);
                    this.children.push({
                        path: this.children.length.toString(),
                        label: `'${section?.getTitle()}' section`,
                        enabled: true,
                        children: [child]
                    });
                } else {
                    tableMapIndex = `${existingChildIdx}/${this.children[existingChildIdx].children.length}`;
                    const child = this.createChild(label, table, tableMapIndex);
                    this.children[existingChildIdx].children.push(child);
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
        const tableMapKey = this.children.length.toString();
        if (
            isA(SMART_TABLE_TYPE, table) ||
            isA(M_TABLE_TYPE, table) ||
            isA(MDC_TABLE_TYPE, table) ||
            isA(TREE_TABLE_TYPE, table) ||
            isA(GRID_TABLE_TYPE, table) ||
            isA(ANALYTICAL_TABLE_TYPE, table)
        ) {
            const label = this.getTableLabel(table);
            const child = this.createChild(label, table, tableMapKey);
            this.children.push(child);
        }

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

    createChild(label: string, table: UI5Element, path: string): NestedQuickActionChild {
        const child: NestedQuickActionChild = {
            path,
            label,
            enabled: true,
            children: []
        };
        if (this.options.validatePageVariantManagement) {
            const variantEnabledV2 = isVariantManagementEnabledOPPage(this.context, table);
            if (variantEnabledV2 === false) {
                child.enabled = false;
                child.tooltip = this.context.resourceBundle.getText(
                    'TABLE_ACTION_DISABLED_VARIANT_MANAGEMENT_NOT_AVAILABLE'
                );
                return child;
            }
        }
        if (!this.options.areTableRowsRequired) {
            return child;
        }
        const innerTable = this.getInternalTable(table);
        const tableRows = innerTable?.getAggregation('items') ?? [];
        if (isA(M_TABLE_TYPE, innerTable) && Array.isArray(tableRows) && tableRows.length === 0) {
            child.enabled = false;
            child.tooltip = this.context.resourceBundle.getText('TABLE_ACTION_DISABLED_ROWS_NOT_AVAILABLE');
        }
        return child;
    }
}
