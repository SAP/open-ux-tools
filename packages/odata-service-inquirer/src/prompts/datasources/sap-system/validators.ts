import { t } from '../../../i18n';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { readFileSync } from 'node:fs';
import { getBackendSystemService } from '../../../utils/store';

/**
 * Check if the system name is already in use.
 *
 * @param systemName a system name to check
 * @returns true if the system name is already in use, otherwise false
 */
async function isSystemNameInUse(systemName: string): Promise<boolean> {
    const backendService = await getBackendSystemService();
    const backendSystems = await backendService.getAll({
        includeSensitiveData: false
    });
    return !!backendSystems.find((system) => system.name === systemName);
}

/**
 * Validates that the system name does not exist yet.
 *
 * @param systemName a system name to validate
 * @returns true if the name is valid, otherwise an error message
 */
export async function validateSystemName(systemName: string): Promise<boolean | string> {
    if (!systemName) {
        return t('prompts.systemName.emptySystemNameWarning');
    }
    const systemExists = await isSystemNameInUse(systemName);
    if (systemExists) {
        return t('prompts.systemName.systemNameExistsWarning');
    } else {
        return true;
    }
}

/**
 * Validates the existence and content of the file at the given path and returns the service key info if valid.
 *
 * @param path path to a service key file
 * @returns the service key info if the file is valid, otherwise an error message
 */
export function validateServiceKey(path: string): string | ServiceInfo | boolean {
    if (!path) {
        return false;
    }
    try {
        const serviceKeys = readFileSync(path, 'utf8');
        const serviceInfo: ServiceInfo = JSON.parse(serviceKeys);

        if (!serviceInfo.url || !serviceInfo.uaa || !serviceInfo.catalogs) {
            return t('prompts.serviceKey.incompleteServiceKeyInfo');
        }
        return serviceInfo;
    } catch (error) {
        return error.name === 'SyntaxError' ? t('prompts.serviceKey.unparseableServiceKey') : error.message;
    }
}

/**
 * Validates the specified origin and service path can be used to form a valid URL.
 *
 * @param origin the origin of the service
 * @param servicePath the path to the service
 * @returns true if a URL can be created from the specified parameters, otherwise an error message
 */
export function validateServiceUrl(origin: string, servicePath: string): string | boolean {
    try {
        new URL(servicePath, origin);
        return true;
    } catch (error) {
        return t('errors.invalidUrl', { input: `${origin}${servicePath}` });
    }
}
