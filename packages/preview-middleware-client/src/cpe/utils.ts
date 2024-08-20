import type ManagedObject from 'sap/ui/base/ManagedObject';
import type Control from 'sap/ui/core/Control';
import Element from 'sap/ui/core/Element';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import DataType from 'sap/ui/base/DataType';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import XMLView from 'sap/ui/core/mvc/XMLView';
import UIComponent from 'sap/ui/core/UIComponent';


import { getComponent } from './ui5-utils';
import { isLowerThanMinimalUi5Version, Ui5VersionInfo } from '../utils/version';

export interface PropertiesInfo {
    defaultValue: string;
    description: string;
    propertyName: string;
    type: string;
    propertyType: string | undefined;
}
export interface Properties {
    [key: string]: PropertiesInfo;
}


export interface ManagedObjectMetadataProperties {
    name: string;
    defaultValue: string | null;
    deprecated: boolean;
    getType: () => DataType;
    getName: () => string;
    getDefaultValue: () => unknown;
}

/**
 * Get runtime control.
 *
 * @param overlayControl - element overlay.
 * @returns ManagedObject
 */
export function getRuntimeControl(overlayControl: ElementOverlay): ManagedObject {
    let runtimeControl;
    if (overlayControl.getElementInstance) {
        runtimeControl = overlayControl.getElementInstance();
    } else {
        runtimeControl = overlayControl.getElement();
    }
    return runtimeControl;
}

/**
 * Get library of a control name.
 *
 * @param controlName - name of the ui5 control eg: sap.m.Button.
 * @returns Promise<string>
 */
export async function getLibrary(controlName: string): Promise<string> {
    return new Promise((resolve) => {
        const controlPath = controlName.replace(/\./g, '/');
        sap.ui.require([controlPath], (control: Control) => {
            const contMetadata = control.getMetadata();
            // getLibraryName method does not exist on events
            if (contMetadata?.getLibraryName) {
                const contLibName = contMetadata.getLibraryName();
                resolve(contLibName);
            } else {
                resolve(''); // return empty for events
            }
        });
    });
}

/**
 * Function that checks if control is reuse component
 *
 * @param controlId id control
 * @param ui5VersionInfo UI5 version information
 * @returns boolean if control is from reused component view
 */
export function isReuseComponent(controlId: string, ui5VersionInfo: Ui5VersionInfo): boolean {
    if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 115 })) {
        return false;
    }

    const component = getComponent(controlId);
    if (!component) {
        return false;
    }

    const manifest = component.getManifest() as Manifest;
    if (!manifest) {
        return false;
    }

    return manifest['sap.app']?.type === 'component';
}

/**
 * Returns control by its global ID.
 *
 * @param id Id of the control.
 * @returns Control instance if it exists.
 */
export function getControlById<T extends Element = Element>(id: string): T | undefined {
    if (typeof Element.getElementById === 'function') {
        return Element.getElementById(id) as T;
    } else {
        return sap.ui.getCore().byId(id) as T;
    }
}

/**
 * Checks wether this object is an instance of a ManagedObject.
 *
 * @param element An object.
 * @returns True if element is an instance of a ManagedObject.
 */
export function isManagedObject(element: object | undefined): element is ManagedObject {
    if (typeof (element as unknown as { isA?: (_type: string) => boolean })?.isA === 'function') {
        return (element as unknown as { isA: (_type: string) => boolean }).isA('sap.ui.base.ManagedObject');
    }

    return false;
}

/**
 * Checks whether this object is an instance of the named type.
 *
 * @param type - Type to check for.
 * @param element - Object to check
 * @returns Whether this object is an instance of the given type.
 */
export function isA<T extends ManagedObject>(type: string, element: ManagedObject | undefined): element is T {
    return !!element?.isA(type);
}

/**
 * Gets the root view of component for the provided ComponentContainer control.
 *
 * @param container ComponentContainer control.
 * @returns XMLView which is the root control of the component if it exists.
 */
export function getRootControlFromComponentContainer(container: Control): XMLView | undefined {
    if (container instanceof ComponentContainer) {
        const componentId = container.getComponent();
        const component = getComponent(componentId);
        if (component instanceof UIComponent) {
            const rootControl = component.getRootControl();
            if (rootControl instanceof XMLView) {
                return rootControl;
            }
        }
    }
    return undefined;
}
