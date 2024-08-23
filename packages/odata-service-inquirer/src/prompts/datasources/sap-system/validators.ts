import { t } from '../../../i18n';
import { SystemService } from '@sap-ux/store';
import LoggerHelper from '../../logger-helper';
import type { ServiceInfo } from '@sap-ux/btp-utils';
import { readFileSync } from 'fs';

/**
 * Check if the system name is already in use.
 *
 * @param systemName a system name to check
 * @returns true if the system name is already in use, otherwise false
 */
async function isSystemNameInUse(systemName: string): Promise<boolean> {
    const backendSystems = await new SystemService(LoggerHelper.logger).getAll();
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
