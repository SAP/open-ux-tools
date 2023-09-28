/**
 * Internal types, not exported for consumer use
 */
import type { EntityConfig } from '../types';

/**
 * Internal interface used to write entity settings while maintaining a stable external interface
 *
 */
export interface ManifestEntitySettings extends EntityConfig {
    contextPath?: string;
    navigationEntity?: EntityConfig['navigationEntity'] & {
        contextPath?: string; // Defines the entity set for object page navigation
    };
}
