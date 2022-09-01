import type { CustomElement, InternalCustomElement } from '../common/types';

/**
 * Controller extension's associated page type.
 *
 * @enum {string}
 */
export enum ControllerExtensionPageType {
    ObjectPage = 'ObjectPage',
    ListReport = 'ListReport'
}

/**
 * Represents a controller extension configuration.
 */
export interface ControllerExtension extends CustomElement {
    /**
     * The page type for which controller extension should be triggered.
     */
    pageType: ControllerExtensionPageType;
    /**
     * The unique page id for which controller extension should be triggered.
     */
    pageId?: string;
    /**
     * Controls if controller(s) for existing controller extension should be appended or replaced with new controller.
     */
    overwrite?: boolean;
}

/**
 * Represents a controller extension configuration in manifest.
 */
export interface ManifestControllerExtension {
    /**
     * Specifies single controller for controller extension.
     */
    controllerName?: string;
    /**
     * Specifies multiple controllers for controller extension.
     */
    controllerNames?: string[];
}

export interface InternalControllerExtension
    extends ControllerExtension,
        ManifestControllerExtension,
        InternalCustomElement {
    /**
     * Derived full extension key/id in manifest "sap.ui.controllerExtensions" object.
     */
    extensionId: string;
    /**
     * Delete property from existing control extension object in manifest.
     */
    deleteProperty?: keyof ManifestControllerExtension;
}
