import UI5Element from 'sap/ui/core/Element';
import Control from 'sap/ui/core/Control';
import ManagedObject from 'sap/ui/base/ManagedObject';
import { FEAppPage } from 'sap/ui/rta/RuntimeAuthoring';

import { getControlById, isA } from '../../utils/core';

import type { ControlTreeIndex } from '../types';
import Component from 'sap/ui/core/Component';

export interface FEAppPageInfo {
    page: FEAppPage;
    isInvisible: boolean;
}
export interface FEAppPagesMap {
    [key: string]: FEAppPageInfo[];
}

/**
 * Checks if control is visible in the page.
 * 
 * @param page - Page control.
 * @param controlId - UI5 control id.
 * @returns True if control is visible in the page.
 */
export function pageHasControlId(page: Control, controlId: string): boolean {
    const controlDomElement = getControlById(controlId)?.getDomRef();
    return !!controlDomElement && !!page?.getDomRef()?.contains(controlDomElement);
}


/**
 * Checks if control is a child element of the rootControl.
 * 
 * @param control - UI5 Control to be tested.
 * @param rootControl - UI5 root control.
 * @returns True if control is the child of the specified rootControl.
 */
function isDescendantOfPage(control: ManagedObject | null | undefined, rootControl: ManagedObject) {
    let currentControl = control;
    while (currentControl) {
        if (currentControl === rootControl) {
            return true;
        }
        // if parent is a reusable component, use oContainer to find the parent
        if (
            isA<Component>('sap.ui.core.Component', currentControl) &&
            (currentControl as unknown as { oContainer: Control })?.oContainer
        ) {
            currentControl = (currentControl as unknown as { oContainer: Control }).oContainer.getParent();
        } else {
            currentControl = currentControl.getParent();
        }
    }
    return false;
}

/**
 * Find all controls in page that match the provided types.
 * 
 * @param controlIndex - Control tree index.
 * @param activePage - Active page control.
 * @param controlTypes - Relevant control types.
 * @returns A list of UI5 controls.
 */
export function getRelevantControlFromActivePage(
    controlIndex: ControlTreeIndex,
    activePage: Control,
    controlTypes: string[]
): UI5Element[] {
    const relevantControls: UI5Element[] = [];
    for (const type of controlTypes) {
        const controls = controlIndex[type] ?? [];
        for (const control of controls) {
            const ui5Control = getControlById(control.controlId);
            const parent = ui5Control?.getParent();
            const isActionApplicable = isDescendantOfPage(parent, activePage);

            if (isActionApplicable && ui5Control) {
                // if parent control added, discard adding child control.
                // Relevant for cases where wrapper exists eg: sap.m.Table exist in sap.ui.comp.smarttable.SmartTable
                const parentFound = relevantControls.findIndex(
                    (relevantControl) => relevantControl.getId() === ui5Control.getParent()?.getId()
                );
                if (parentFound === -1) {
                    relevantControls.push(ui5Control);
                }
            }
        }
    }
    return relevantControls;
}

export function getParentContainer<T extends ManagedObject>(
    control: ManagedObject | null | undefined,
    type: string
): T | undefined {
    let currentControl = control;
    while (currentControl) {
        if (isA<T>(type, currentControl)) {
            return currentControl;
        }
        // if parent is a reusable component, use oContainer to find the parent
        if (
            isA<Component>('sap.ui.core.Component', currentControl) &&
            (currentControl as unknown as { oContainer: Control })?.oContainer
        ) {
            currentControl = (currentControl as unknown as { oContainer: Control }).oContainer.getParent();
        } else {
            currentControl = currentControl.getParent();
        }
    }
    return undefined;
}