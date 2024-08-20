import type ManagedObject from 'sap/ui/base/ManagedObject';
import type Control from 'sap/ui/core/Control';
import Element from 'sap/ui/core/Element';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import DataType from 'sap/ui/base/DataType';
import Log from 'sap/base/Log';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import ComponentContainer from 'sap/ui/core/ComponentContainer';
import XMLView from 'sap/ui/core/mvc/XMLView';
import UIComponent from 'sap/ui/core/UIComponent';
import DTElement from 'sap/ui/dt/Element';
import FlexUtils from 'sap/ui/fl/Utils';

import { getError } from './error-utils';
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

/**
 * Check if element is sync view
 *
 * @param element Design time Element
 * @returns boolean if element is sync view or not
 */
function isSyncView(element: DTElement): boolean {
    return element?.getMetadata()?.getName()?.includes('XMLView') && element?.oAsyncState === undefined;
}

/**
 * Get Ids for all sync views
 *
 * @param ui5VersionInfo UI5 Version Information
 *
 * @returns array of Ids for application sync views
 */
export async function getAllSyncViewsIds(ui5VersionInfo: Ui5VersionInfo): Promise<string[]> {
    const syncViewIds: string[] = [];
    try {
        if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 120 })) {
            const elements = Element.registry.filter(() => true) as DTElement[];
            elements.forEach((ui5Element) => {
                if (isSyncView(ui5Element)) {
                    syncViewIds.push(ui5Element.getId());
                }
            });
        } else {
            const ElementRegistry = (await import('sap/ui/core/ElementRegistry')).default;
            const elements = ElementRegistry.all() as Record<string, DTElement>;
            Object.entries(elements).forEach(([key, ui5Element]) => {
                if (isSyncView(ui5Element)) {
                    syncViewIds.push(key);
                }
            });
        }
    } catch (error) {
        Log.error('Could not get application sync views', getError(error));
    }

    return syncViewIds;
}

/**
 * Gets controller name and view ID for the given UI5 control.
 *
 * @param control UI5 control.
 * @returns The controller name and view ID.
 */

export function getControllerInfoForControl(control: ManagedObject): ControllerInfo {
    const view = FlexUtils.getViewForControl(control);
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
 * Handler for enablement of Extend With Controller context menu entry
 *
 * @param control UI5 control.
 * @param syncViewsIds Runtime Authoring
 * @param ui5VersionInfo UI5 version information
 *
 * @returns boolean whether menu item is enabled or not
 */
export function isControllerExtensionEnabledForControl(
    control: ManagedObject,
    syncViewsIds: string[],
    ui5VersionInfo: Ui5VersionInfo
): boolean {
    const clickedControlId = FlexUtils.getViewForControl(control).getId();
    const isClickedControlReuseComponent = isReuseComponent(clickedControlId, ui5VersionInfo);

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
