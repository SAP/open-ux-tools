import ManagedObject from 'sap/ui/base/ManagedObject';
import TemplateComponent from 'sap/fe/core/TemplateComponent';
import Component from 'sap/ui/core/Component';
import AppComponent from 'sap/fe/core/AppComponent';
import XMLView from 'sap/ui/core/mvc/XMLView';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import { isA } from './core';


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

export function getConfigMapControlIdMap(page: string | undefined, propertyPathSegments: string[]): string {
    if (page && !propertyPathSegments.length) {
        return page;
    }

    if (page) {
        return `${page}-${propertyPathSegments.join('/')}`;
    }
    return propertyPathSegments.join('/');
}
