import type ManagedObject from 'sap/ui/base/ManagedObject';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import Component from 'sap/ui/core/Component';
import type TemplateComponent from 'sap/fe/core/TemplateComponent';
import type AppComponent from 'sap/fe/core/AppComponent';

import { isA } from '../../../utils/core';

/**
 * Get the containing app component of a control.
 *
 * @param control - UI5 control instance.
 * @returns App component to which the control belongs.
 */
export function getAppComponent(control: ManagedObject): AppComponent | undefined {
    const ownerComponent = Component.getOwnerComponentFor(control);
    if (isA<TemplateComponent>('sap.fe.core.TemplateComponent', ownerComponent)) {
        return ownerComponent.getAppComponent();
    }
    return undefined;
}
/**
 * Get the containing page name of a control.
 *
 * @param control - UI5 control instance.
 * @returns Page name to which the control belongs.
 */
export function getPageName(control: ManagedObject): string | undefined {
    const component = Component.getOwnerComponentFor(control);
    if (!isA<TemplateComponent>('sap.fe.core.TemplateComponent', component)) {
        return undefined;
    }
    const view = component.getRootControl();
    return view.getId().split('::').pop();
}

/**
 * Gets a reference id for a control.
 *
 * @param control - UI5 control instance.
 * @returns Reference id.
 */
export function getReference(control: ManagedObject): string {
    // probably same as flex setting id or base id TODO: CONFIRM
    const manifest = getAppComponent(control)?.getManifest() as Manifest;
    return manifest?.['sap.app']?.id ?? '';
}
