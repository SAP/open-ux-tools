import { CustomElement, InternalCustomElement, Manifest } from './types';
import { join, dirname } from 'path';

/**
 * Sets the common default values for all custom elements.
 *
 * @param config custom element configuration object
 * @param {string} manifestPath - path to the project's manifest.json
 * @param {Manifest} manifest - the application manifest
 * @returns enhanced configuration
 */
export function setCommonDefaults<T extends CustomElement & Partial<InternalCustomElement>>(
    config: T,
    manifestPath: string,
    manifest: Manifest
): InternalCustomElement & T {
    // enforce naming conventions
    const firstChar = config.name[0];
    config.name = firstChar.toUpperCase() + config.name.substring(1);

    // set target folder if not provided
    config.folder = config.folder || `ext/${firstChar.toLocaleLowerCase() + config.name.substring(1)}`;

    // calculate namespace and path for generated artifacts
    config.ns = `${manifest['sap.app'].id}.${config.folder.replace(/\//g, '.')}`;
    config.path = join(dirname(manifestPath), config.folder);

    return config as InternalCustomElement & T;
}

/**
 * Method to generate default content for fragment.
 *
 * @param {string} text - visible text of button or label
 * @param {string} [eventHandler] - event handler path
 *      if value is passed then "Button" with 'press' event would be used
 *      if value is not passed then "Text" would be used
 * @returns default content for fragment
 */
export function getDefaultFragmentContent(text: string, eventHandler?: string): string {
    let content: string;
    if (eventHandler) {
        const parts = (eventHandler as string).split('.');
        const method = parts.pop();
        const handler = parts.join('/');
        content = `<Button core:require="{ handler: '${handler}'}" text="${text}" press="handler.${method}" />`;
    } else {
        content = `<Text text="${text}" />`;
    }
    return content;
}
