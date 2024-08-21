import UI5Element from 'sap/ui/core/Element';
import Control from 'sap/ui/core/Control';
import ManagedObject from 'sap/ui/base/ManagedObject';
import { FEAppPage, Manifest } from 'sap/ui/rta/RuntimeAuthoring';

import { getControlById } from '../../utils/core';

import type { ControlTreeIndex } from '../types';

export interface FEAppPageInfo {
    page: FEAppPage;
    isInvisible: boolean;
}
export interface FEAppPagesMap {
    [key: string]: FEAppPageInfo[];
}

export function pageHasControlId(page: Control, controlId: string): boolean {
    const controlDomElement = getControlById(controlId)?.getDomRef();
    return !!controlDomElement && !!page?.getDomRef()?.contains(controlDomElement);
}

function isDescendantOfPage(control: ManagedObject | null | undefined, oRootControl: ManagedObject) {
    let currentControl = control;
    while (currentControl) {
        if (currentControl === oRootControl) {
            return true;
        }
        currentControl = currentControl.getParent();
    }
    return false;
}

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

/**
 * Determines Fiori Elements version based on the manifest.json.
 *
 * @param manifest - Application Manifest.
 * @returns Fiori Elements version.
 */
export function getFeVersion(manifest: Manifest): 'v2' | 'v4' | undefined {
    if (manifest['sap.ui.generic.app'] || manifest['sap.ovp']) {
        return 'v2';
    } else if (manifest['sap.ui5']?.routing?.targets) {
        let hasV4pPages = false;
        Object.keys(manifest?.['sap.ui5']?.routing?.targets ?? []).forEach((target) => {
            if (manifest?.['sap.ui5']?.routing?.targets?.[target]?.name?.startsWith('sap.fe.templates.')) {
                hasV4pPages = true;
            }
        });
        if (hasV4pPages) {
            return 'v4';
        } else {
            return undefined;
        }
    } else {
        return undefined;
    }
}
