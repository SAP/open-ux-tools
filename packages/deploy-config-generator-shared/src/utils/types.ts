import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';

export interface ConnectedSystem {
    serviceProvider?: ServiceProvider;
    backendSystem?: BackendSystem;
    destination?: Destination;
}
