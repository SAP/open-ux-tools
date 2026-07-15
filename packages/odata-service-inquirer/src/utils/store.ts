import {
    getService,
    type BackendSystem,
    type BackendSystemKey,
    type ConnectionType,
    type Service
} from '@sap-ux/store';
import LoggerHelper from '../prompts/logger-helper.js';
import { t } from '../i18n.js';

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

/**
 * Fetch all backend systems.
 *
 * @param includeSensitiveData - whether to include sensitive data
 * @param connectionTypes - optional list of connection types to filter backend systems
 * @returns backend systems
 */
export async function getAllBackendSystems(
    includeSensitiveData = false,
    connectionTypes: ConnectionType[] = ['abap_catalog', 'odata_service']
): Promise<BackendSystem[] | []> {
    let backendSystems: BackendSystem[] | [] = [];
    try {
        const backendService = await getBackendSystemService();
        backendSystems = await backendService.getAll({
            includeSensitiveData,
            backendSystemFilter: {
                connectionType: connectionTypes
            }
        });
    } catch (error) {
        LoggerHelper.logger.error(t('errors.backendSystemRetrieval', { error: error.message }));
    }
    return backendSystems;
}
