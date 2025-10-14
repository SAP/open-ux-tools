import FlexChange from 'sap/ui/fl/Change';
import { getControlById, findViewByControl } from '../../utils/core';
import {
    ANALYTICAL_TABLE_TYPE,
    GRID_TABLE_TYPE,
    MDC_TABLE_TYPE,
    TREE_TABLE_TYPE
} from '../../adp/quick-actions/control-types';
import Element from 'sap/ui/core/Element';

export type AddXMLAdditionalInfo = {
    templateName?: string;
    targetAggregation?: string;
    controlType?: string;
    viewName?: string;
};

export type AddXMLChangeContent = {
    targetAggregation?: string;
};

export function getAddXMLAdditionalInfo(change: FlexChange<AddXMLChangeContent>): AddXMLAdditionalInfo | undefined {
    const selectorId = change.getSelector()?.id ?? '';
    const targetAggregation = change.getContent()?.targetAggregation ?? '';
    const targetControl = getControlById(selectorId);
    const controlType = targetControl?.getMetadata().getName() ?? '';
    const templateName = getFragmentTemplateName(selectorId, targetAggregation);
    const viewName = targetControl ? (findViewByControl(targetControl)?.getViewName() ?? '') : '';

    const result: AddXMLAdditionalInfo = {};
    if (templateName) {
        result.templateName = templateName;
    }
    if (controlType && targetAggregation && viewName) {
        result.targetAggregation = targetAggregation;
        result.controlType = controlType;
        result.viewName = viewName;
    }
    
    return Object.keys(result).length > 0 ? result : undefined;
}

export function getFragmentTemplateName(selectorId: string, targetAggregation: string): string {
    const control = getControlById(selectorId);

    if (!control) {
        return '';
    }

    const controlName = control.getMetadata().getName();
    if (controlName === 'sap.uxap.ObjectPageLayout' && targetAggregation === 'sections') {
        return 'OBJECT_PAGE_CUSTOM_SECTION';
    } else if (isCustomAction(controlName, targetAggregation)) {
        return 'CUSTOM_ACTION';
    } else if (isObjectPageHeaderField(control, controlName, targetAggregation)) {
        return 'OBJECT_PAGE_HEADER_FIELD';
    } else if (targetAggregation === 'columns') {
        switch (controlName) {
            case MDC_TABLE_TYPE:
                return 'V4_MDC_TABLE_COLUMN';
            case TREE_TABLE_TYPE:
            case GRID_TABLE_TYPE:
                return 'GRID_TREE_TABLE_COLUMN';
            case ANALYTICAL_TABLE_TYPE:
                return 'ANALYTICAL_TABLE_COLUMN';
            default:
                return '';
        }
    } else if (controlName === 'sap.ui.mdc.Table' && targetAggregation === 'actions') {
        return 'TABLE_ACTION';
    }
    return '';
}

function isCustomAction(controlName: string, targetAggregation: string): boolean {
    if (
        ['sap.f.DynamicPageTitle', 'sap.uxap.ObjectPageHeader', 'sap.uxap.ObjectPageDynamicHeaderTitle'].includes(
            controlName
        )
    ) {
        return targetAggregation === 'actions';
    } else if (controlName === 'sap.m.OverflowToolbar' || controlName === 'sap.m.Toolbar') {
        return targetAggregation === 'content';
    }
    return false;
}

function isObjectPageHeaderField(control: Element, controlName: string, targetAggregation: string): boolean {
    if (controlName === 'sap.uxap.ObjectPageLayout') {
        return targetAggregation === 'headerContent';
    } else if (controlName === 'sap.m.FlexBox') {
        const parentName = control.getParent()?.getMetadata().getName();
        if (parentName === 'sap.uxap.ObjectPageDynamicHeaderContent' || parentName === 'sap.uxap.ObjectPageLayout') {
            return targetAggregation === 'items';
        }
    }
    return false;
}
