import type { UI5LibInput, UI5LibConfig } from '../types';
import { validate } from './validators';

/**
 * Merges UI5LibConfig instance with default properties.
 *
 * @param {UI5LibConfig} libConfig - the UI5LibConfig instance
 * @returns {UI5LibInput} - a new UI5LibInput instance with all required defaults set
 */
export function mergeWithDefaults(libConfig: UI5LibConfig): UI5LibInput {
    validate(libConfig);
    const libraryNamespace = `${libConfig.namespace}.${libConfig.libraryName}`;
    const libInput: UI5LibInput = {
        ...libConfig,
        namespaceURI: libConfig.namespace.split('.').join('/'),
        libraryNamespace,
        libraryNamespaceURI: libraryNamespace.split('.').join('/'),
        libraryBasepath:
            libraryNamespace
                .split('.')
                .map((_) => '..')
                .join('/') + '/'
    };

    return libInput;
}
