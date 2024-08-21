import type ManagedObject from 'sap/ui/base/ManagedObject';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import Component from 'sap/ui/core/Component';
import type TemplateComponent from 'sap/fe/core/TemplateComponent';
import type AppComponent from 'sap/fe/core/AppComponent';

import {  isA } from '../../../utils/core';

export function getAppComponent(control: ManagedObject): AppComponent | undefined {
    const ownerComponent = Component.getOwnerComponentFor(control);
    if (isA<TemplateComponent>('sap.fe.core.TemplateComponent', ownerComponent)) {
        return ownerComponent.getAppComponent();
    }
    return undefined;
}
export function getPageName(control: ManagedObject): string | undefined {
    const component = Component.getOwnerComponentFor(control);
    if (!isA<TemplateComponent>('sap.fe.core.TemplateComponent', component)) {
        return undefined;
    }
    const view = component.getRootControl();
    return view.getId().split('::').pop();
}

export function getReference(modifiedControl: ManagedObject): string {
    // probably same as flex setting id or base id TODO: CONFIRM
    const manifest = getAppComponent(modifiedControl)?.getManifest() as Manifest;
    return manifest?.['sap.app']?.id ?? '';
}
