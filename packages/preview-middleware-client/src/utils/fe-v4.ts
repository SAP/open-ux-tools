import ManagedObject from 'sap/ui/base/ManagedObject';
import TemplateComponent from 'sap/fe/core/TemplateComponent';
import Component from 'sap/ui/core/Component';
import AppComponent from 'sap/fe/core/AppComponent';
import XMLView from 'sap/ui/core/mvc/XMLView';
import type { FlexSettings, Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import { isA } from './core';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { getOverlay } from '../cpe/utils';
import UI5Element from 'sap/ui/core/Element';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

/**
 * Gets app component of a v4 project.
 *
 * @param control - ManagedObject.
 * @returns AppComponent.
 */
export function getV4AppComponent(control: ManagedObject): AppComponent | undefined {
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
    const manifest = getV4AppComponent(control)?.getManifest() as Manifest;
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

/**
 * Get the modified value for a control.
 * @param modifiedControl - The modified control.
 * @param flexSettings - Flex Settings of the control.
 * @param propertyChanges - The change object
 * @param propertyPathExtraSegments - optional path segments which are added to the default modified control manifest path
 *
 * @returns  A Promise resolving to an array of FlexCommand objects.
 */
export async function createManifestPropertyChange(
    modifiedControl: UI5Element,
    flexSettings: FlexSettings,
    propertyChanges: Record<string, string | string[] | boolean | number | object | undefined>,
    propertyPathExtraSegments?: string[]
): Promise<FlexCommand | undefined> {
    const overlay = getOverlay(modifiedControl);
    if (!overlay) {
        return undefined;
    }
    const overlayData = overlay?.getDesignTimeMetadata().getData();
    let manifestPropertyPath = overlayData.manifestPropertyPath(modifiedControl);
    if (propertyPathExtraSegments) {
        manifestPropertyPath += '/' + propertyPathExtraSegments.join('/');
    }
    const [manifestPropertyChange] = overlayData.manifestPropertyChange(
        propertyChanges,
        manifestPropertyPath,
        modifiedControl
    );

    const modifiedValue = {
        reference: getReference(modifiedControl),
        appComponent: manifestPropertyChange.appComponent,
        changeType: manifestPropertyChange.changeSpecificData.appDescriptorChangeType,
        parameters: manifestPropertyChange.changeSpecificData.content.parameters,
        selector: manifestPropertyChange.selector
    };

    const command = await CommandFactory.getCommandFor(
        modifiedControl,
        'appDescriptor',
        modifiedValue,
        null,
        flexSettings
    );

    return command;
}
