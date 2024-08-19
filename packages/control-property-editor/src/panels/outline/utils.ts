import type { OutlineNode } from '@sap-ux-private/control-property-editor-common';
import type { FilterOptions } from '../../slice';
import { FilterName } from '../../slice';
import type { IGroup } from '@fluentui/react';

const commonVisibleControls = [
    'sap.ui.comp.smarttable.SmartTable',
    'sap.m.Column',
    'sap.ui.comp.smartfilterbar.SmartFilterBar',
    'sap.ui.comp.filterbar.FilterItems',
    'sap.m.Button',
    'sap.m.MultiInput',
    'sap.ui.comp.smartform.SmartForm',
    'sap.ui.comp.smartform.Group',
    'sap.ui.comp.smartform.GroupElement',
    'sap.uxap.ObjectPageSection',
    'sap.m.Bar',
    'sap.m.OverflowToolbarButton',
    'sap.m.MultiComboBox',
    'sap.m.ComboBox',
    'sap.m.OverflowToolbar',
    'sap.m.Table',
    'sap.m.Dialog',
    'sap.ui.comp.ValueHelpDialog',
    'sap.viz.ui5.controls.VizFrame',
    'sap.ovp.ui.Card',
    'sap.ui.extensionpoint',
    'sap.ui.extensionpoint.child'
];

/**
 * Filter model. If none of filter conditions meet, model without filter is returned.
 *
 * @param model OutlineNode[]
 * @param filterOptions FilterOptions[]
 * @returns OutlineNode[]
 */
export function getFilteredModel(model: OutlineNode[], filterOptions: FilterOptions[]): OutlineNode[] {
    let filteredModel: OutlineNode[] = [];
    for (const option of filterOptions) {
        if (option.name === FilterName.query) {
            if (filteredModel.length > 0) {
                // filter based on filtered model
                filteredModel = filterByQuery(filteredModel, option);
            } else {
                filteredModel = filterByQuery(model, option);
            }
        } else if (option.name === FilterName.focusCommonlyUsed) {
            if (filteredModel.length > 0) {
                // filter based on filtered model
                filteredModel = filterByCommonlyUsedControls(filteredModel, option);
            } else {
                filteredModel = filterByCommonlyUsedControls(model, option);
            }
        }
    }

    return filteredModel;
}

/**
 * Filter by options.
 *
 * @param model OutlineNode[]
 * @param filterOption FilterOptions
 * @returns OutlineNode[]
 */
function filterByQuery(model: OutlineNode[], filterOption: FilterOptions) {
    const filteredModel: OutlineNode[] = [];
    const query = (filterOption.value as string).toLocaleUpperCase();
    if (query.length === 0) {
        return model;
    }
    for (const item of model) {
        let parentMatch = false;
        const name = item.name.toLocaleUpperCase();
        if (name.includes(query)) {
            parentMatch = true;
            // add node without its children
            filteredModel.push({ ...item, children: [] });
        }
        if (item.children.length) {
            const data = filterByQuery(item.children, filterOption);
            if (data.length > 0) {
                // children matched filter query
                if (parentMatch) {
                    // parent matched filter query and pushed already to `filterModel`. only  replace matched children
                    filteredModel[filteredModel.length - 1].children = data;
                } else {
                    // add node and its matched children
                    const newFilterModel = { ...item, children: data };
                    filteredModel.push(newFilterModel);
                }
            }
        }
    }
    return filteredModel;
}

/**
 * Filter by commonly used control.
 *
 * @param model OutlineNode[]
 * @param filterOption FilterOptions
 * @returns OutlineNode[]
 */
function filterByCommonlyUsedControls(model: OutlineNode[], filterOption: FilterOptions) {
    const filteredModel: OutlineNode[] = [];
    const checked = filterOption.value as boolean;
    if (!checked) {
        return model;
    }
    for (const item of model) {
        let parentMatch = false;
        const controlType = item.controlType;
        if (commonVisibleControls.includes(controlType)) {
            parentMatch = true;
            // add node without its children
            filteredModel.push({ ...item, children: [] });
        }
        if (item.children.length) {
            const data = filterByCommonlyUsedControls(item.children, filterOption);
            if (data.length > 0) {
                // children matched filter query
                if (parentMatch) {
                    // parent matched filter query and pushed already to `filterModel`. only  replace matched children
                    filteredModel[filteredModel.length - 1].children = data;
                } else {
                    // add node and its matched children
                    const newFilterModel = { ...item, children: data };
                    filteredModel.push(newFilterModel);
                }
            }
        }
    }
    return filteredModel;
}

export const isSame = (a: string[], b: string) => {
    return JSON.stringify(a) === JSON.stringify(b);
};

export const adaptExpandCollapsed = (groups: IGroup[], collapsed: IGroup[]) => {
    if (collapsed.length === 0) {
        return;
    }
    for (const group of groups) {
        const [collapsedResult] = collapsed.filter((data) => isSame(group.data.path, data.data.path));
        if (collapsedResult) {
            group.isCollapsed = true;
        }
        if (group.children) {
            adaptExpandCollapsed(group.children, collapsed);
        }
    }
};
