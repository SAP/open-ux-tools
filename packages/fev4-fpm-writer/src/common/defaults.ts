import { CustomElement, InternalCustomElement, Manifest } from './types';
import { join, dirname } from 'path';

/**
 * Sets the common default values for all custom elements.
 *
 * @param config custom element configuration object
 */
export function setCommonDefaults<T extends CustomElement & Partial<InternalCustomElement>>(
    config: T,
    manifestPath: string,
    manifest: Manifest
): InternalCustomElement & T {
    // enforce naming conventions
    const firstChar = config.id[0];
    config.id = firstChar.toUpperCase() + config.id.substring(1);

    // set target folder if not provided
    config.folder = config.folder || `ext/${firstChar.toLocaleLowerCase() + config.id.substring(1)}`;

    (config.ns = `${manifest['sap.app'].id}.${config.folder!.replace(/\//g, '.')}`),
        (config.path = join(dirname(manifestPath), config.folder!));

    return config as InternalCustomElement & T;
}
