import UI5Element from 'sap/ui/core/Element';
import Control from 'sap/ui/core/Control';
import ManagedObject from 'sap/ui/base/ManagedObject';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import { FEAppPage, Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import Component from 'sap/ui/core/Component';

import type { ControlTreeIndex } from '../types';
import { getControlById } from '../utils';
import View from 'sap/ui/core/mvc/View';

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

export function getRelevantControlFromActivePage(
    controlIndex: ControlTreeIndex,
    activePage: Control,
    controlTypes: string[]
): UI5Element[] {
    const relevantControls: UI5Element[] = [];
    for (const type of controlTypes) {
        const controls = controlIndex[type] ?? [];
        for (const control of controls) {
            // const isActionApplicable = pageHasControlId(activePage, control.controlId);
            const ctrl = getControlById(control.controlId)?.getParent() || null;
            const isActionApplicable = isDescendantOfPage(ctrl, activePage);

            const UI5ControlData = getControlById(control.controlId);
            if (isActionApplicable && UI5ControlData) {
                relevantControls.push(UI5ControlData);
            }
        }
    }
    return relevantControls;
}

export function getTargetView(modifiedControl: ManagedObject) {
    if (modifiedControl && modifiedControl.isA('sap.ui.core.ComponentContainer')) {
        const oComponent = (modifiedControl as ComponentContainer).getComponent();
        modifiedControl = oComponent && oComponent.getRootControl();
    }
    while (modifiedControl && !modifiedControl.isA('sap.ui.core.mvc.View')) {
        modifiedControl = (modifiedControl as View).getParent();
    }
    return modifiedControl;
}
export function getPageName(modifiedControl: ManagedObject) {
    const modifiedControl1 = getTargetView(modifiedControl);
    return modifiedControl1.getId().split('::').pop();
}

export function getReference(modifiedControl: ManagedObject) {
    // probably same as flexsetting id or base id TODO: CONFIRM
    const manifest = getAppComponent(modifiedControl).getManifest();
    return manifest['sap.app'].id;
}

export function getAppComponent(control: ManagedObject) {
    const ownerComponent = Component.getOwnerComponentFor(control);
    if (ownerComponent) {
        return ownerComponent.getAppComponent();
    }
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
        Object.keys(manifest['sap.ui5'].routing.targets).forEach((target) => {
            if (manifest['sap.ui5'].routing.targets[target].name?.startsWith('sap.fe.templates.')) {
                hasV4pPages = true;
            }
        });
        if (hasV4pPages) {
            return 'v4';
        } else {
            return undefined;
        }
    } else {
        return 'v4';
    }
}

function isDescendantOfPage(control: ManagedObject | null, oRootControl: ManagedObject) {
    while (control) {
        if (control === oRootControl) {
            return true;
        }
        control = control.getParent();
    }
    return false;
}
