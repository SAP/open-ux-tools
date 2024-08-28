import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';
import UI5Element from 'sap/ui/core/Element';
import type IconTabBar from 'sap/m/IconTabBar';
import type IconTabFilter from 'sap/m/IconTabFilter';
import type Table from 'sap/m/Table';
import type SmartTable from 'sap/ui/comp/smarttable/SmartTable';

import type { NestedQuickAction, NestedQuickActionChild } from '@sap-ux-private/control-property-editor-common';
import { NESTED_QUICK_ACTION_KIND } from '@sap-ux-private/control-property-editor-common';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getParentContainer, getRelevantControlFromActivePage } from '../../../cpe/quick-actions/utils';
import { getControlById, isA, isManagedObject } from '../../../utils/core';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import ObjectPageSection from 'sap/uxap/ObjectPageSection';
import ObjectPageSubSection from 'sap/uxap/ObjectPageSubSection';
import TreeTable from 'sap/ui/table/TreeTable';
import ObjectPageLayout from 'sap/uxap/ObjectPageLayout';

export const CHANGE_TABLE_COLUMNS = 'change-table-columns';
const SMART_TABLE_ACTION_ID = 'CTX_COMP_VARIANT_CONTENT';
const M_TABLE_ACTION_ID = 'CTX_ADD_ELEMENTS_AS_CHILD';
const SETTINGS_ID = 'CTX_SETTINGS';
const ICON_TAB_BAR_TYPE = 'sap.m.IconTabBar';
const SMART_TABLE_TYPE = 'sap.ui.comp.smarttable.SmartTable';
const M_TABLE_TYPE = 'sap.m.Table';
// maintain order if action id
const CONTROL_TYPES = [SMART_TABLE_TYPE, M_TABLE_TYPE, 'sap.ui.table.TreeTable', 'sap.ui.table.Table'];

async function getActionId(table: UI5Element): Promise<string[]> {
    const { major, minor } = await getUi5Version();

    if (isA(SMART_TABLE_TYPE, table)) {
        if (major === 1 && minor === 96) {
            return [M_TABLE_ACTION_ID];
        } else {
            return [SMART_TABLE_ACTION_ID];
        }
    }

    return [M_TABLE_ACTION_ID, SETTINGS_ID];
}

export class ChangeTableColumnsQuickAction implements NestedQuickActionDefinition {
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = CHANGE_TABLE_COLUMNS;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    isActive = false;
    isClearButtonEnabled = false;
    children: NestedQuickActionChild[] = [];
    tableMap: Record<
        string,
        {
            table: UI5Element;
            tableUpdateEventAttachedOnce: boolean;
            iconTabBarFilterKey?: string;
            changeColumnActionId: string;
            sectionInfo?: {
                section: ObjectPageSection;
                subSection: ObjectPageSubSection;
                layout?: ObjectPageLayout;
            };
        }
    > = {};
    private iconTabBar: IconTabBar | undefined;
    constructor(private context: QuickActionContext) {}

    async initialize(): Promise<void> {
        // No action found in control design time for version < 1.96
        // TODO check with RTA of using `openPersonalisationDialog("Column")`.
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 96 })) {
            this.isActive = false;
            return;
        }
        // Assumption only a tab bar control per page.
        const tabBar = getRelevantControlFromActivePage(this.context.controlIndex, this.context.view, [
            ICON_TAB_BAR_TYPE
        ])[0];
        const filters: { [key: string]: string } = {};
        if (tabBar) {
            const control = getControlById(tabBar.getId());
            if (isA<IconTabBar>(ICON_TAB_BAR_TYPE, control)) {
                this.iconTabBar = control;
                for (const item of control.getItems()) {
                    if (isManagedObject(item) && isA<IconTabFilter>('sap.m.IconTabFilter', item)) {
                        filters[item.getKey()] = item.getText();
                    }
                }
            }
        }
        for (const table of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            CONTROL_TYPES
        )) {
            const actions = await this.context.actionService.get(table.getId());
            const actionsIds = await getActionId(table);
            const changeColumnAction = actionsIds.find(
                (actionId) => actions.findIndex((action) => action.id === actionId) > -1
            );
            const tabKey = Object.keys(filters).find((key) => table.getId().endsWith(key));
            if (changeColumnAction) {
                const section = getParentContainer<ObjectPageSection>(table, 'sap.uxap.ObjectPageSection');
                if (section) {
                    this.collectChildrenInSection(section, table, changeColumnAction);
                } else if (this.iconTabBar && tabKey) {
                    this.children.push({
                        label: `'${filters[tabKey]}' table`,
                        children: []
                    });
                    this.tableMap[`${this.children.length - 1}`] = {
                        table,
                        iconTabBarFilterKey: tabKey,
                        changeColumnActionId: changeColumnAction,
                        tableUpdateEventAttachedOnce: false
                    };
                } else {
                    this.processTable(table, changeColumnAction);
                }
            }
        }
        if (this.children.length > 0) {
            this.isActive = true;
        }
    }

    private getTableLabel(table: UI5Element): string {
        let label = 'Unnamed table';
        if (isA<SmartTable>(SMART_TABLE_TYPE, table) && table.getHeader()) {
            label = `'${table.getHeader()}' table`;
        }
        if (isA<Table>(M_TABLE_TYPE, table) && table?.getHeaderToolbar()?.getTitleControl()?.getText()) {
            label = `'${table?.getHeaderToolbar()?.getTitleControl()?.getText()}' table`;
        }

        return label;
    }

    private collectChildrenInSection(section: ObjectPageSection, table: UI5Element, changeColumnAction: string): void {
        const layout = getParentContainer<ObjectPageLayout>(table, 'sap.uxap.ObjectPageLayout');
        const subSections = section.getSubSections();
        const subSection = getParentContainer<ObjectPageSubSection>(table, 'sap.uxap.ObjectPageSubSection');
        if (subSection) {
            if (subSections?.length === 1) {
                this.processTable(table, changeColumnAction, { section, subSection: subSections[0], layout });
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
                    changeColumnActionId: changeColumnAction,
                    sectionInfo: { section, subSection, layout },
                    tableUpdateEventAttachedOnce: false
                };
            }
        }
    }

    private processTable(
        table: UI5Element,
        changeColumnActionId: string,
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
            changeColumnActionId,
            sectionInfo: sectionInfo,
            tableUpdateEventAttachedOnce: false
        };
    }

    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title:
                this.context.resourceBundle.getText('V2_QUICK_ACTION_CHANGE_TABLE_COLUMNS') ?? 'Change table columns',
            children: this.children
        };
    }

    private selectOverlay(table: UI5Element): void {
        const controlOverlay = OverlayUtil.getClosestOverlayFor(table);
        if (controlOverlay) {
            controlOverlay.setSelected(true);
        }
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table, iconTabBarFilterKey, changeColumnActionId, sectionInfo } = this.tableMap[path];
        if (!table) {
            return [];
        }

        if (sectionInfo) {
            const { layout, section, subSection } = sectionInfo;
            layout?.setSelectedSection(section);
            section.setSelectedSubSection(subSection);
            this.selectOverlay(table);
        } else {
            getControlById(table.getId())?.getDomRef()?.scrollIntoView();
            this.selectOverlay(table);
        }

        if (this.iconTabBar && iconTabBarFilterKey) {
            this.iconTabBar.setSelectedKey(iconTabBarFilterKey);
        }

        const executeAction = async () => await this.context.actionService.execute(table.getId(), changeColumnActionId);
        if (isA<SmartTable>(SMART_TABLE_TYPE, table)) {
            await executeAction();
        } else if (isA<Table>(M_TABLE_TYPE, table)) {
            // if table is busy, i.e. lazy loading, then we subscribe to 'updateFinished' event and call action service when loading is done
            // to avoid reopening the dialog after close
            table.attachEventOnce(
                'updateFinished',
                async () => {
                    if (!this.tableMap[path].tableUpdateEventAttachedOnce) {
                        this.tableMap[path].tableUpdateEventAttachedOnce = true;
                        await executeAction();
                    }
                },
                this
            );
            if (this.tableMap[path].tableUpdateEventAttachedOnce) {
                await executeAction();
            }
        }

        return [];
    }
}
