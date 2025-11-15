import { getService, type BackendSystem, type BackendSystemKey, type Service } from '@sap-ux/store';
import LoggerHelper from '../prompts/logger-helper';
import { t } from '../i18n';

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
 * @returns backened systems
 */
export async function getAllBackendSystems(includeSensitiveData = false): Promise<BackendSystem[] | []> {
    let backendSystems: BackendSystem[] | [] = [];
    try {
        const backendService = await getBackendSystemService();
        backendSystems = await backendService.getAll({
            includeSensitiveData
        });
    } catch (error) {
        LoggerHelper.logger.error(t('errors.backendSystemRetrieval', { error: error.message }));
    }
    return backendSystems;
}
