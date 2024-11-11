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
import { DesigntimeSetting } from 'sap/ui/dt/DesignTimeMetadata';
import { ChangeService } from './changes';
import UI5Element from 'sap/ui/core/Element';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';

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

export interface MergedSetting extends DesigntimeSetting {
    defaultValue: unknown;
    value: unknown;
    configuration: boolean;
    name: string;
    readableName: string;
    manifestPropertyPath: string;
    type: 'string' | 'int' | 'boolean' | 'undefined';
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

export function getManifestProperties(
    control: ManagedObject,
    changeService: ChangeService,
    controlOverlay?: ElementOverlay
): {
    [key: string]: MergedSetting;
} {
    const overlayData = controlOverlay?.getDesignTimeMetadata().getData();
    if (!controlOverlay || !overlayData?.manifestSettings) {
        return {};
    }
    const manifestPropertiesValue = overlayData?.manifestSettingsValues(
        overlayData?.manifestSettings(control),
        control
    );
    const manifestProperties = overlayData?.manifestSettings(control).reduce(
        (
            acc: {
                [key: string]: MergedSetting;
            },
            item: DesigntimeSetting
        ) => {
            const propertyId = item.id;
            const value = changeService.getConfigurationPropertyValue(control.getId(), propertyId);
            let propertyValue = value === 0 || value === false || value ? value : manifestPropertiesValue[propertyId];
            if (item?.type && ['boolean', 'number', 'string'].includes(item?.type)) {
                if (propertyValue === undefined) {
                    propertyValue = item.value as string | boolean | number; // set default value of property
                }
            }
            if (!acc[propertyId]) {
                acc[propertyId] = {
                    ...item,
                    defaultValue: item.value,
                    configuration: true,
                    name: item.id,
                    readableName: item.name,
                    manifestPropertyPath: `${overlayData?.manifestPropertyPath(control)}/${propertyId}`,
                    type: item.type === 'number' ? 'int' : (item.type as 'string' | 'boolean' | 'undefined'),
                    value: propertyValue
                };
            }
            return acc;
        },
        {}
    );
    return manifestProperties;
}

export const getOverlay = (control: UI5Element): ElementOverlay | undefined => {
    let controlOverlay = OverlayRegistry.getOverlay(control);
    if (!controlOverlay?.getDomRef()) {
        //look for closest control
        controlOverlay = OverlayUtil.getClosestOverlayFor(control);
    }

    return controlOverlay;
};
