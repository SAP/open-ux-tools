import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';

export interface ConnectedSystem {
    serviceProvider?: ServiceProvider;
    backendSystem?: BackendSystem;
    destination?: Destination;
}

/**
 * Minimal structural type for the Yeoman environment's `create` method. In yeoman-environment v6
 * `env.create(namespaceOrPath, instantiateOptions?)` is async and resolves to a generator instance.
 * This wrapper only reads `_getExtensions()` off the created generator, so a loose local type
 * avoids a fragile transitive dependency on the `@yeoman/types` environment interface.
 */
export type CreateEnv = (namespaceOrPath: string) => Promise<unknown>;
