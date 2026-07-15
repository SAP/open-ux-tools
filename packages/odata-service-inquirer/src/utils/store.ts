import {
    getService,
    type BackendSystem,
    type BackendSystemKey,
    type BackendSystemFilter,
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
 * @param backendSystemFilter - optional filter to apply when retrieving backend systems
 * @returns backend systems
 */
export async function getAllBackendSystems(
    includeSensitiveData = false,
    backendSystemFilter: BackendSystemFilter = { connectionType: ['abap_catalog', 'odata_service'] }
): Promise<BackendSystem[] | []> {
    let backendSystems: BackendSystem[] | [] = [];
    try {
        const backendService = await getBackendSystemService();
        backendSystems = await backendService.getAll({
            includeSensitiveData,
            backendSystemFilter
        });
    } catch (error) {
        LoggerHelper.logger.error(t('errors.backendSystemRetrieval', { error: error.message }));
    }
    return backendSystems;
}
