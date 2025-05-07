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
 * Checks if the fragment name associated with a command matches the specified fragment name.
 *
 * @param {FlexCommand} command - The command object containing the prepared change to be examined.
 * @param {string} fragmentName - The name of the fragment to match against the command's change.
 * @returns {boolean} Returns true if the command's change contains a fragment path that matches
 *                    the specified fragment name; otherwise, returns false.
 */
export function matchesFragmentName(command: FlexCommand, fragmentName: string): boolean {
    if (typeof command.getPreparedChange !== 'function') {
        return false;
    }
    const change = command.getPreparedChange().getDefinition() as unknown as FragmentChange;
    return change.content?.fragmentPath?.includes(`${fragmentName}.fragment.xml`) || false;
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
