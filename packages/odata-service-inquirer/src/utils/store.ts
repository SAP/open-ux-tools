import { getService, type BackendSystem, type BackendSystemKey, type Service } from '@sap-ux/store';

/**
 *  Get the backend system service instance.
 *
 * @returns the backend system service instance
 */
export async function getBackendSystemService(): Promise<Service<BackendSystem, BackendSystemKey>> {
    const backendService = await getService<BackendSystem, BackendSystemKey>({
        entityName: 'system'
    });
    return backendService;
}
