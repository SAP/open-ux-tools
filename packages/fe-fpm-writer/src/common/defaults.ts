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
    const firstChar = config.name[0];
    config.name = firstChar.toUpperCase() + config.name.substring(1);

    // set target folder if not provided
    config.folder = config.folder || `ext/${firstChar.toLocaleLowerCase() + config.name.substring(1)}`;

    // calculate namespace and path for generated artifacts
    config.ns = `${manifest['sap.app'].id}.${config.folder!.replace(/\//g, '.')}`;
    config.path = join(dirname(manifestPath), config.folder!);

    return config as InternalCustomElement & T;
}
