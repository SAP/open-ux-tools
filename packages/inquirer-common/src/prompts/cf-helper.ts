import type { ServiceInstanceInfo } from '@sap/cf-tools';
import { apiGetServicesInstancesFilteredByType as getServicesInstances } from '@sap/cf-tools';
import type { ListChoiceOptions } from 'inquirer';
import { ERROR_TYPE, type ErrorHandler } from '../error-handler/error-handler';
import { t } from '../i18n';
import { AbapEnvType } from '@sap-ux/btp-utils';

/**
 * Get the name sorted list of ABAP instance choices from an active CF login. If not logged in, an error message is logged.
 *
 * @param errorHandler The error handler instance used to log and retain messages for use in prompts
 * @returns The list of ABAP instance choices
 */
export async function getCFAbapInstanceChoices(
    errorHandler: ErrorHandler
): Promise<ListChoiceOptions<ServiceInstanceInfo>[]> {
    const choices: ListChoiceOptions[] = [];
    try {
        const filteredInstances = [
            AbapEnvType.ABAP,
            AbapEnvType.ABAP_TRIAL,
            AbapEnvType.ABAP_CANARY,
            AbapEnvType.ABAP_OEM,
            AbapEnvType.ABAP_OEM_CANARY,
            AbapEnvType.ABAP_HAAS,
            AbapEnvType.ABAP_STAGING,
            AbapEnvType.ABAP_INTERNAL_STAGING
        ];
        const serviceInstanceInfo: ServiceInstanceInfo[] = await getServicesInstances(filteredInstances);
        if (serviceInstanceInfo.length > 0) {
            serviceInstanceInfo.forEach((service) => {
                choices.push({ name: service['label'], value: service });
            });
        } else {
            // No envs found
            errorHandler.logErrorMsgs(ERROR_TYPE.NO_ABAP_ENVS, t('errors.noAbapEnvsInCFSpace'));
        }
    } catch (error) {
        // Cannot connect to CF
        errorHandler.logErrorMsgs(ERROR_TYPE.NO_ABAP_ENVS, t('errors.abapEnvsCFDiscoveryFailed'));
    }
    return choices.sort((a, b) => (a.name ? a.name.localeCompare(b.name ?? '') : 0));
}
