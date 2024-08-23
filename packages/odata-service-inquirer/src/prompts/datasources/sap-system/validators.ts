import { t } from '../../../i18n';
import { SystemService } from '@sap-ux/store';
import LoggerHelper from '../../logger-helper';

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
 */ export async function validateSystemName(systemName: string): Promise<boolean | string> {
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
