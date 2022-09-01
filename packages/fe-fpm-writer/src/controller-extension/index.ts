import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import { render } from 'ejs';
import type { ControllerExtension, InternalControllerExtension, ManifestControllerExtension } from './types';
import { ControllerExtensionPageType } from './types';
import { validateBasePath } from '../common/validate';
import type { Manifest } from '../common/types';
import { setCommonDefaults } from '../common/defaults';

export const UI5_CONTROLLER_EXTENSION_LIST_REPORT = 'sap.fe.templates.ListReport.ListReportController';
export const UI5_CONTROLLER_EXTENSION_OBJECT_PAGE = 'sap.fe.templates.ObjectPage.ObjectPageController';
const UI5_CONTROLLER_EXTENSIONS = 'sap.ui.controllerExtensions';
export const EXTENSION_PAGE_TYPE_MAP = new Map<ControllerExtensionPageType, string>([
    [ControllerExtensionPageType.ListReport, UI5_CONTROLLER_EXTENSION_LIST_REPORT],
    [ControllerExtensionPageType.ObjectPage, UI5_CONTROLLER_EXTENSION_OBJECT_PAGE]
]);

interface ManifestControllerExtensions {
    [key: string]: ManifestControllerExtension;
}

/**
 * A function appends passed array of values with new value if value does not exist in array.
 *
 * @param values - array of values
 * @param value - value to append
 * @returns Array of values
 */
function appendUniqueEntryToArray<T>(values: T[], value: T): T[] {
    if (!values.includes(value)) {
        values.push(value);
    }
    return values;
}

/**
 * Method enhances the provided controller extension by handling existing controller extension entry from manifest.
 * Logic applies following:
 * 1. Handles public property "overwrite" - if we should append or overwrite existing controller names.
 * 2. Detects transition from "controllerName" to "controllerNames" when new controller is appended to exiusting entry with property "controllerNames".
 * 3. Adds new controller entry to "controllerNames" array.
 *
 * @param {ManifestControllerExtension} manifestExtension - controller extension from manifest
 * @param {InternalControllerExtension} config - internal controller extension configuration
 * @param {string} controllerName - full name of new controller to add or replace/overwrite
 */
function handleExistingManifestExtension(
    manifestExtension: ManifestControllerExtension,
    config: InternalControllerExtension,
    controllerName: string
): void {
    if (config.overwrite) {
        if (manifestExtension.controllerNames) {
            // Delete "controllerNames" from manifest because it will be overwritten by single controllerName
            config.deleteProperty = 'controllerNames';
        }
        // Do not need append new controller with existing - exit further handling
        return;
    }
    // Append new controller extension with existing controllers
    if (manifestExtension.controllerName && manifestExtension.controllerName !== config.controllerName) {
        // Manifest has single controller - transfer it into array
        config.controllerNames = manifestExtension.controllerNames ? [...manifestExtension.controllerNames] : [];
        // Check before append
        appendUniqueEntryToArray(config.controllerNames, manifestExtension.controllerName);
        appendUniqueEntryToArray(config.controllerNames, controllerName);
        // Delete "controllerName" from manifest
        config.deleteProperty = 'controllerName';
    } else if (manifestExtension.controllerNames && !manifestExtension.controllerNames.includes(controllerName)) {
        // Manifest has array of controllers - append new entry
        config.controllerNames = appendUniqueEntryToArray([...manifestExtension.controllerNames], controllerName);
    }
}

/**
 * Method enhances the provided controller extension configuration with default and additional data.
 *
 * @param {ControllerExtension} data - a controller extension configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
function enhanceConfig(
    data: ControllerExtension,
    manifestPath: string,
    manifest: Manifest
): InternalControllerExtension {
    // clone input
    const config: ControllerExtension & Partial<InternalControllerExtension> = {
        ...data
    };
    // Apply default data
    setCommonDefaults(config, manifestPath, manifest);
    // Create `controllerName` with full path/namespace
    config.controllerName = `${config.ns}.${config.name}`;
    // Resolve controller extension id/key
    let extensionId = EXTENSION_PAGE_TYPE_MAP.get(config.pageType) || UI5_CONTROLLER_EXTENSION_LIST_REPORT;
    if (config.pageId) {
        // Prepend project id
        extensionId = `${extensionId}#${manifest['sap.app'].id}::${config.pageId}`;
    }
    config.extensionId = extensionId;
    // Get existing controller extension entry from manifest
    const manifestExtension = (
        manifest['sap.ui5']?.extends?.extensions?.[UI5_CONTROLLER_EXTENSIONS] as ManifestControllerExtensions
    )?.[extensionId];
    // If controller extension already exists in manifest - append new controller
    if (manifestExtension) {
        handleExistingManifestExtension(
            manifestExtension,
            config as InternalControllerExtension,
            config.controllerName
        );
    }

    return config as InternalControllerExtension;
}

/**
 * A function that transforms JSON object during JSON.stringify call.
 * Method is used to remove 'controllerName' or 'controllerNames' properties from manifest in case when we have transition from 'controllerName' to 'controllerNames'.
 *
 * @param {InternalControllerExtension} config - a controller extension configuration object
 * @returns Json replacer method
 */
function getManifestReplacer(
    config: InternalControllerExtension
): ((key: string, value: Manifest) => unknown) | undefined {
    let isRoot = true;
    const { deleteProperty } = config;
    if (!deleteProperty) {
        // No request to delete any property
        return undefined;
    }
    const propertyName = deleteProperty === 'controllerNames' ? 'controllerNames' : 'controllerName';
    return (key: string, value: Manifest) => {
        // Handle only root - more stable solution instead of checking 'key'
        if (key === '' && isRoot) {
            isRoot = false;
            const extension = (
                value['sap.ui5']?.extends?.extensions?.[UI5_CONTROLLER_EXTENSIONS] as ManifestControllerExtensions
            )?.[config.extensionId];
            delete extension[propertyName];
        }
        return value;
    };
}

/**
 * Add a controller extension to an existing UI5 application.
 *
 * @param {string} basePath - the base path
 * @param {ControllerExtension} controllerConfig - the controller extension configuration
 * @param {Editor} [fs] - the memfs editor instance
 * @returns {Editor} the updated memfs editor instance
 */
export function generateControllerExtension(
    basePath: string,
    controllerConfig: ControllerExtension,
    fs?: Editor
): Editor {
    // Validate the base and view paths
    if (!fs) {
        fs = create(createStorage());
    }
    validateBasePath(basePath, fs);

    const manifestPath = join(basePath, 'webapp/manifest.json');
    const manifest = fs.readJSON(manifestPath) as Manifest;

    const root = join(__dirname, '../../templates');

    // merge with defaults
    const internalConfig = enhanceConfig(controllerConfig, manifestPath, manifest);

    // enhance manifest with view definition
    const filledTemplate = render(fs.read(join(root, 'controller-extension', `manifest.json`)), internalConfig, {});
    fs.extendJSON(manifestPath, JSON.parse(filledTemplate), getManifestReplacer(internalConfig));

    // add controller js file
    const viewPath = join(internalConfig.path, `${internalConfig.name}.controller.js`);
    if (!fs.exists(viewPath)) {
        fs.copyTpl(join(root, 'controller-extension/Controller.js'), viewPath, internalConfig);
    }

    return fs;
}
