import UI5Element from 'sap/ui/core/Element';
import { NESTED_QUICK_ACTION_KIND, NestedQuickAction } from '@sap-ux-private/control-property-editor-common';
import type IconTabBar from 'sap/m/IconTabBar';
import type IconTabFilter from 'sap/m/IconTabFilter';
import type Table from 'sap/m/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';
import { QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import type { NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { getParentContainer, getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById, isA, isManagedObject } from '../../../utils/core';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import ObjectPageSection from 'sap/uxap/ObjectPageSection';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import TreeTable from 'sap/ui/table/TreeTable';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';

const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const SETTINGS_ID = 'CTX_SETTINGS';
const ICON_TAB_BAR_TYPE = 'sap.m.IconTabBar';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
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

    public isActive = false;

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
    ) {}

    /**
     * Initializes action object instance
     */
    async initialize(): Promise<void> {
        // No action found in control design time for version < 1.96
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 96 })) {
            this.isActive = false;
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
                this.collectChildrenInSection(section, table);
            } else if (this.iconTabBar && tabKey) {
                this.children.push({
                    label: `'${iconTabBarfilterMap[tabKey]}' table`,
                    children: []
                });
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
            this.isActive = true;
        }
    }

    /**
     * Determines table label for the given table element
     * @param table - table element
     * @returns table label if found or 'Unnamed table'
     */
    private getTableLabel(table: UI5Element): string {
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            const header = table.getHeader();
            if (header) {
                return `'${header}' table`;
            }
        }
        if (isA<Table>(M_TABLE_TYPE, table)) {
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
     */
    private collectChildrenInSection(section: ObjectPageSection, table: UI5Element): void {
        const layout = getParentContainer<ObjectPageLayout>(table, 'sap.uxap.ObjectPageLayout');
        const subSections = section.getSubSections();
        const subSection = getParentContainer<ObjectPageSubSection>(table, 'sap.uxap.ObjectPageSubSection');
        if (subSection) {
            if (subSections?.length === 1) {
                this.processTable(table, { section, subSection: subSections[0], layout });
            } else if (subSections.length > 1) {
                const sectionChild = this.children.find((val) => val.label === `${section.getTitle()} section`);
                let tableMapIndex = `${this.children.length - 1}`;
                if (!sectionChild) {
                    tableMapIndex = `${tableMapIndex}/0`;
                    this.children.push({
                        label: `'${section?.getTitle()}' section`,
                        children: [
                            {
                                label: this.getTableLabel(table),
                                children: []
                            }
                        ]
                    });
                } else {
                    tableMapIndex = `${tableMapIndex}/${sectionChild.children.length - 1}`;
                    sectionChild.children.push({
                        label: this.getTableLabel(table),
                        children: []
                    });
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
     */
    private processTable(
        table: UI5Element,
        sectionInfo?: { section: ObjectPageSection; subSection: ObjectPageSubSection; layout?: ObjectPageLayout }
    ): void {
        if (isA<SmartTable>(SMART_TABLE_TYPE, table) || isA<TreeTable>('sap.ui.table.TreeTable', table)) {
            this.children.push({
                label: this.getTableLabel(table),
                children: []
            });
        }
        if (isA<Table>(M_TABLE_TYPE, table)) {
            this.children.push({
                label: this.getTableLabel(table),
                children: []
            });
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
            enabled: this.isActive,
            title: this.context.resourceBundle.getText(this.textKey),
            children: this.children
        };
    }
}
