import ManagedObject from 'sap/ui/base/ManagedObject';
import TemplateComponent from 'sap/fe/core/TemplateComponent';
import Component from 'sap/ui/core/Component';
import AppComponent from 'sap/fe/core/AppComponent';
import XMLView from 'sap/ui/core/mvc/XMLView';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

/**
 * Gets reference id of the app.
 *
 * @param control - ManagedObject.
 * @returns string.
 */
export function getReference(control: ManagedObject): string {
    const manifest = getAppComponent(control)?.getManifest() as Manifest;
    return manifest?.['sap.app']?.id ?? '';
}


/**
 * Gets app component of a v4 project.
 *
 * @param control - ManagedObject.
 * @returns AppComponent.
 */
export function getAppComponent(control: ManagedObject): AppComponent | undefined {
    const ownerComponent = Component.getOwnerComponentFor(control);
    if (ownerComponent?.isA<TemplateComponent>('sap.fe.core.TemplateComponent')) {
        return ownerComponent.getAppComponent();
    }
    return undefined;
}

/**
 * Determines the page type of v4 app.
 *
 * @param control - ManagedObject.
 * @returns 'ObjectPage' | 'ListReport' | undefined.
 */
export function getV4PageType(control: ManagedObject): 'ObjectPage' | 'ListReport' | undefined {
    const component = Component.getOwnerComponentFor(control);
    if (!component?.isA<TemplateComponent>('sap.fe.core.TemplateComponent')) {
        return undefined;
    }
    const view = component.getRootControl();
    const name = (view as XMLView).getViewName();
    if (name === 'sap.fe.templates.ObjectPage.ObjectPage') {
        return 'ObjectPage';
    }
    if (name === 'sap.fe.templates.ListReport.ListReport') {
        return 'ListReport';
    }
}
