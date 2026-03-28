import type { BackendSystem } from '@sap-ux/store';

/**
 * Thrown when a system with the same URL and client already exists in the store.
 * Carries the existing system reference so callers can surface it in the UI.
 */
export class ConnectionExistsError extends Error {
    constructor(public readonly existingSystem: BackendSystem) {
        super('Connection already exists');
    }
}
