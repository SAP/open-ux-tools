import type ManagedObject from 'sap/ui/base/ManagedObject';
import type Control from 'sap/ui/core/Control';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import DataType from 'sap/ui/base/DataType';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import XMLView from 'sap/ui/core/mvc/XMLView';
import UIComponent from 'sap/ui/core/UIComponent';

import { getComponent } from '../utils/core';
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
 * Gets the root view of component for the provided ComponentContainer control.
 *
 * @param container ComponentContainer control.
 * @returns XMLView which is the root control of the component if it exists.
 */
export function getRootControlFromComponentContainer(container?: ComponentContainer): XMLView | undefined {
    if (container) {
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
