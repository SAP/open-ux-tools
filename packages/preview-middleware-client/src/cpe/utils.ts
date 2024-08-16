import type ManagedObject from 'sap/ui/base/ManagedObject';
import type Control from 'sap/ui/core/Control';
import Element from 'sap/ui/core/Element';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import DataType from 'sap/ui/base/DataType';
import log from 'sap/base/Log';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

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

interface ControllerInfo {
    controllerName: string;
    viewId: string;
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

import { getError } from './error-utils';
import UI5Element from 'sap/ui/dt/Element';
import Utils from 'sap/ui/fl/Utils';
import { getComponent } from './ui5-utils';
/**
 * Get Ids for all sync views
 *
 * @param minor UI5 Version
 *
 * @returns array of Ids for application sync views
 */
export async function getAllSyncViewsIds(minor: number): Promise<string[]> {
    const syncViewIds: string[] = [];
    try {
        if (minor < 120) {
            const Element = (await import('sap/ui/core/Element')).default;
            const elements = Element.registry.filter(() => true) as UI5Element[];
            elements.forEach((ui5Element) => {
                if (isSyncView(ui5Element)) {
                    syncViewIds.push(ui5Element.getId());
                }
            });
        } else {
            const ElementRegistry = (await import('sap/ui/core/ElementRegistry')).default;
            const elements = ElementRegistry.all() as Record<string, UI5Element>;
            Object.entries(elements).forEach(([key, ui5Element]) => {
                if (isSyncView(ui5Element)) {
                    syncViewIds.push(key);
                }
            });
        }
    } catch (error) {
        log.error('Could not get application sync views', getError(error));
    }

    return syncViewIds;
}

/**
 * Check if element is sync view
 *
 * @param element UI5Element
 * @returns boolean if element is sync view or not
 */
const isSyncView = (element: UI5Element): boolean => {
    return element?.getMetadata()?.getName()?.includes('XMLView') && element?.oAsyncState === undefined;
};

/**
 * Gets controller name and view ID for the given UI5 control.
 *
 * @param control UI5 control.
 * @returns The controller name and view ID.
 */

export function getControllerInfoForControl(control: ManagedObject): ControllerInfo {
    const view = Utils.getViewForControl(control);
    const controllerName = view.getController().getMetadata().getName();
    const viewId = view.getId();
    return { controllerName, viewId };
}

/**
 * Gets controller name and view ID for the given overlay control.
 *
 * @param overlayControl The overlay control.
 * @returns The controller name and view ID.
 */

export function getControllerInfo(overlayControl: ElementOverlay): ControllerInfo {
    const control = overlayControl.getElement();
    return getControllerInfoForControl(control);
}

/**
 * Function that checks if control is reuse component.
 *
 * @param controlId - Id of the control.
 * @param minorUI5Version - minor UI5 version.
 * @returns true if control is from reused component view.
 */
export const isReuseComponent = (controlId: string, minorUI5Version: number): boolean => {
    if (minorUI5Version <= 114) {
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
};

/**
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param control UI5 control.
 * @param syncViewsIds Runtime Authoring
 * @param minorUI5Version minor UI5 version
 *
 * @returns boolean whether menu item is enabled or not
 */
export function isControllerExtensionEnabledForControl(
    control: ManagedObject,
    syncViewsIds: string[],
    minorUI5Version: number
): boolean {
    const clickedControlId = Utils.getViewForControl(control).getId();
    const isClickedControlReuseComponent = isReuseComponent(clickedControlId, minorUI5Version);

    return !syncViewsIds.includes(clickedControlId) && !isClickedControlReuseComponent;
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
 * Checks whether this object is an instance of the named type.
 * 
 * @param type - Type to check for.
 * @param element - Object to check
 * @returns Whether this object is an instance of the given type.
 */
export function isA<T extends ManagedObject>(type: string, element: ManagedObject | undefined): element is T {
    return !!element?.isA(type);
}
