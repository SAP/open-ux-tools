import type { CustomElement, FragmentContentData, InternalCustomElement, Manifest } from './types';
import { join, dirname } from 'path';

export const FCL_ROUTER = 'sap.f.routing.Router';

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
    // set target folder if not provided
    config.folder = config.folder || `ext/${config.name[0].toLocaleLowerCase() + config.name.substring(1)}`;

    // calculate namespace and path for generated artifacts
    config.ns = `${manifest['sap.app'].id}.${config.folder.replace(/[\/\\]/g, '.')}`;
    config.path = join(dirname(manifestPath), config.folder);

    return config as InternalCustomElement & T;
}

/**
 * Method to generate default content data for xml fragment.
 *
 * @param {string} text - text of button or label
 * @param {string} [eventHandler] - event handler path
 *      if value is passed then "Button" control with 'press' event would be generated
 *      if value is not passed then "Text" control would be generated
 * @param {boolean} isController - controls if `controller` should be added to handler path
 * @param {boolean} prefferInput - controls if `input` element should be added to default fragment content
 * @param {boolean} includeRequireInContent - controls if `core:require` attribute should be included to fragment content
 * @returns default content for fragment
 */
export function getDefaultFragmentContentData(
    text: string,
    eventHandler?: string,
    isController = false,
    prefferInput = false,
    includeRequireInContent = true
): FragmentContentData {
    let content: string;
    let requireAttribute: string | undefined;
    if (eventHandler) {
        const parts = eventHandler.split('.');
        const method = parts.pop();
        const handler = `${parts.join('/')}${isController ? '.controller' : ''}`;
        requireAttribute = `core:require="{ handler: '${handler}'}"`;
        const attributes = [];
        if (includeRequireInContent) {
            attributes.push(requireAttribute);
        }
        if (prefferInput) {
            attributes.push(`value="${text}"`);
            attributes.push(`change="handler.${method}"`);
            content = `<Input ${attributes.join(' ')} />`;
        } else {
            attributes.push(`text="${text}"`);
            attributes.push(`press="handler.${method}"`);
            content = `<Button ${attributes.join(' ')} />`;
        }
    } else if (prefferInput) {
        content = `<Input value="${text}" />`;
    } else {
        content = `<Text text="${text}" />`;
    }
    return {
        content,
        requireAttribute
    };
}

/**
 * Method to generate default content for xml fragment.
 *
 * @param {string} text - text of button or label
 * @param {string} [eventHandler] - event handler path
 *      if value is passed then "Button" control with 'press' event would be generated
 *      if value is not passed then "Text" control would be generated
 * @param {boolean} isController - controls if `controller` should be added to handler path
 * @param {boolean} prefferInput - controls if `input` element should be added to default fragment content
 * @returns default content for fragment
 */
export function getDefaultFragmentContent(
    text: string,
    eventHandler?: string,
    isController = false,
    prefferInput = false
): string {
    const contentData = getDefaultFragmentContentData(text, eventHandler, isController, prefferInput);
    return contentData.content;
}
