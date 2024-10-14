import TemplateComponent from 'sap/fe/core/TemplateComponent';
import ManagedObject from 'sap/ui/base/ManagedObject';
import Component from 'sap/ui/core/Component';
import AppComponent from 'sap/fe/core/AppComponent';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import XMLView from 'sap/ui/core/mvc/XMLView';

export type ApplicationType = 'fe-v2' | 'fe-v4' | 'freestyle';

/**
 * Determines application type based on the manifest.json.
 *
 * @param manifest - Application Manifest.
 * @returns Application type.
 */
export function getApplicationType(manifest: Manifest): ApplicationType {
    if (manifest['sap.ui.generic.app'] || manifest['sap.ovp']) {
        return 'fe-v2';
    } else if (manifest['sap.ui5']?.routing?.targets) {
        let hasV4pPages = false;
        Object.keys(manifest?.['sap.ui5']?.routing?.targets ?? []).forEach((target) => {
            if (manifest?.['sap.ui5']?.routing?.targets?.[target]?.name?.startsWith('sap.fe.templates.')) {
                hasV4pPages = true;
            }
        });
        if (hasV4pPages) {
            return 'fe-v4';
        }
    }

    return 'freestyle';
}


export function getReference(control: ManagedObject): string {
    // probably same as flex setting id or base id TODO: CONFIRM
    const manifest = getAppComponent(control)?.getManifest() as Manifest;
    return manifest?.['sap.app']?.id ?? '';
}

export function getAppComponent(control: ManagedObject): AppComponent | undefined {
    const ownerComponent = Component.getOwnerComponentFor(control);
    if (ownerComponent?.isA<TemplateComponent>('sap.fe.core.TemplateComponent')) {
        return ownerComponent.getAppComponent();
    }
    return undefined;
}

export function getPageName(control: ManagedObject): string | undefined {
    const component = Component.getOwnerComponentFor(control);
    if (!component?.isA<TemplateComponent>('sap.fe.core.TemplateComponent')) {
        return undefined;
    }
    const view = component.getRootControl();
    return view.getId().split('::').pop();
}

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