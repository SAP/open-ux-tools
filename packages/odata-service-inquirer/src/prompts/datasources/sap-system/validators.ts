import { t } from '../../../i18n';
import { SystemService } from '@sap-ux/store';
import LoggerHelper from '../../logger-helper';

/**
 * Validates that the system name does not exist yet.
 *
 * @param systemName a system name to validate
 * @returns true if the name is valid, otherwise an error message
 */
export async function validateSystemName(systemName: string): Promise<boolean | string> {
    /*    Do we need this now?
    if (name === t('NEW_SYSTEM') || name === t('LABEL_SAP_SYSTEM_SOURCE_TYPE_SCP')) {
            return t('VALIDATION_ERROR_RESERVED_SYSTEM_NAME', { systemName: name }) + '. ' + t('SYSTEM_NAME_INVALID');
        }*/

    const systemExists = await isSystemNameInUse(systemName);
    if (systemExists) {
        return t('prompts.systemName.systemNameExistsWarning');
    } else {
        return true;
    }
}

/**
 * Check if the system name is already in use.
 *
 * @param systemName a system name to check
 * @returns true if the system name is already in use, otherwise false
 */
export async function isSystemNameInUse(systemName: string): Promise<boolean> {
    // todo: should we cache the system list?
    const backendSystems = await new SystemService(LoggerHelper.logger).getAll();
    return !!backendSystems.find((system) => system.name === systemName);
}
