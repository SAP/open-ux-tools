import MessageToast from 'sap/m/MessageToast';
import Element from 'sap/ui/core/Element';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type DTElement from 'sap/ui/dt/Element';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import Log from 'sap/base/Log';
import FlexUtils from 'sap/ui/fl/Utils';
import IsReuseComponentApi from 'sap/ui/rta/util/isReuseComponent';
import { getControlById } from '../utils/core';
import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { getError } from '../utils/error';
import { isLowerThanMinimalUi5Version, Ui5VersionInfo } from '../utils/version';

export interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
}

export interface FragmentChange {
    content: {
        fragmentPath: string;
    };
}

export type ReuseComponentChecker = (controlId: string) => boolean;

let reuseComponentChecker: ReuseComponentChecker | undefined;

/**
 * Resets the reuse component checker.
 */
export function resetReuseComponentChecker(): void {
    reuseComponentChecker = undefined;
}

/**
 * Defers the resolution of the promise, stores resolve/reject functions so that they can be accessed at a later stage.
 *
 * @description A Deferred object contains an unresolved promise along with the functions to resolve or reject that promise.
 *
 * @returns {Deferred} Deferred object
 */
export function createDeferred<T>(): Deferred<T> {
    let resolve: Deferred<T>['resolve'] | null = null;
    let reject: Deferred<T>['reject'] | null = null;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    if (resolve === null || reject === null) {
        throw new Error('Failed to initialize resolve and reject functions.');
    }

    return { promise, resolve, reject };
}

/**
 * Checks for the existence of a change associated with a specific fragment name in the RTA command stack.
 *
 * @param {RuntimeAuthoring} rta - The RuntimeAuthoring instance to check for existing changes.
 * @param {string} commandName - The name of the fragment to check for existing changes.
 * @param {string} propertyPath - The path to the property as string separated by dot in the change definition to check.
 * @param {string} propertyValue - The value to match against the specified property.
 * @returns {Promise<boolean>} A promise that resolves to `true` if a matching change is found, otherwise `false`.
 */
export function checkForExistingChange(
    rta: RuntimeAuthoring,
    commandName: string,
    propertyPath: string,
    propertyValue: string
): boolean {
    const allCommands = rta.getCommandStack().getCommands();

    return allCommands.some((command: FlexCommand) => {
        if (typeof command.getCommands === 'function') {
            const subCommand = command.getCommands().find((c: FlexCommand) => c?.getProperty('name') === commandName);

            return subCommand && matchesChangeProperty(subCommand, propertyPath, propertyValue);
        } else {
            return matchesChangeProperty(command, propertyPath, propertyValue);
        }
    });
}

/**
 * Retrieves the value of a nested property from an object based on a dot-separated path.
 *
 * @param obj - The object from which to retrieve the nested property.
 * @param path - A dot-separated string representing the path to the desired property.
 *               For example, "a.b.c" will attempt to access `obj.a.b.c`.
 * @returns The value of the nested property if it exists, or `undefined` if any part of the path is invalid.
 */
export function getNestedProperty(obj: object, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key) => {
        return (acc as Record<string, unknown>)?.[key];
    }, obj);
}

/**
 * Checks if a specific property in the command's change matches the given value.
 *
 * @param {FlexCommand} command - The command object containing the prepared change to be examined.
 * @param {string} propertyPath - The path to the property in the change definition to check.
 * @param {string} propertyValue - The value to match against the specified property.
 * @returns {boolean} Returns true if the command's change contains the specified property with the matching value; otherwise, returns false.
 */
export function matchesChangeProperty(command: FlexCommand, propertyPath: string, propertyValue: string): boolean {
    if (typeof command.getPreparedChange !== 'function') {
        return false;
    }
    const change = command.getPreparedChange()?.getDefinition?.();
    if (!change) {
        return false;
    }

    const nestedProperty = getNestedProperty(change, propertyPath);
    return typeof nestedProperty === 'string' ? nestedProperty.includes(propertyValue) : false;
}

/**
 * Displays a message to the user indicating that an XML fragment will be created upon saving a change.
 *
 * @param {string} message - The message to be shown in the message toast.
 * @param {number} duration - The duration during which message toast will be active.
 */
export function notifyUser(message: string, duration: number = 5000) {
    MessageToast.show(message, {
        duration
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
        if (isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 120, patch: 2 })) {
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

interface ControllerInfo {
    controllerName: string;
    viewId: string;
}

/**
 * Gets controller name and view ID for the given UI5 control.
 *
 * @param control UI5 control.
 * @returns The controller name and view ID.
 */
export function getControllerInfoForControl(control: ManagedObject): ControllerInfo {
    const view = FlexUtils.getViewForControl(control);
    const moduleName = view?.getControllerModuleName?.();
    const controllerName = moduleName ? `module:${moduleName}` : view.getController()?.getMetadata().getName();
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
 * Gets the reuse component checker function.
 *
 * @param ui5VersionInfo UI5 version information.
 * @returns The reuse component checker function.
 */
export async function getReuseComponentChecker(ui5VersionInfo: Ui5VersionInfo): Promise<ReuseComponentChecker> {
    if (reuseComponentChecker) {
        return reuseComponentChecker;
    }

    let reuseComponentApi: typeof IsReuseComponentApi;
    if (!isLowerThanMinimalUi5Version(ui5VersionInfo, { major: 1, minor: 134 })) {
        reuseComponentApi = (await import('sap/ui/rta/util/isReuseComponent')).default;
    }

    reuseComponentChecker = function isReuseComponent(controlId: string): boolean {
        const ui5Control = getControlById(controlId);
        if (!ui5Control) {
            return false;
        }

        const component = FlexUtils.getComponentForControl(ui5Control);

        if (reuseComponentApi) {
            return reuseComponentApi(component);
        }

        if (!component) {
            return false;
        }

        const appComponent = FlexUtils.getAppComponentForControl(component);
        if (!appComponent) {
            return false;
        }

        const manifest = component.getManifest() as Manifest;
        const appManifest = appComponent.getManifest() as Manifest;
        const componentName = manifest?.['sap.app']?.id;

        // Look for component name in component usages of app component manifest
        const componentUsages = appManifest?.['sap.ui5']?.componentUsages;
        return Object.values(componentUsages || {}).some((componentUsage) => {
            return componentUsage.name === componentName;
        });
    };

    return reuseComponentChecker;
}
