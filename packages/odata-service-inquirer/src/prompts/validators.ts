import { t } from '../i18n';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import LoggerHelper from './logger-helper';
import { parseOdataVersion } from '../utils';

/**
 * Validator function to verify if the specified metadata edmx version matches the specified required odata version.
 *
 * @param edmx the edmx to validate
 * @param requiredVersion the required odata version to validate against
 * @returns version and/or validation error message
 */
export function validateODataVersion(
    edmx: string,
    requiredVersion?: OdataVersion
): { validationMsg?: string; version?: OdataVersion } {
    try {
        const serviceOdataVersion = parseOdataVersion(edmx);

        if (requiredVersion && requiredVersion !== serviceOdataVersion) {
            const odataErrorMsg = t('prompts.validationMessages.odataVersionMismatch', {
                providedOdataVersion: serviceOdataVersion,
                requiredOdataVersion: requiredVersion
            });
            LoggerHelper.logger.error(odataErrorMsg);
            return {
                validationMsg: odataErrorMsg
            };
        }
        return {
            version: serviceOdataVersion
        };
    } catch (err) {
        return {
            validationMsg: err.message
        };
    }
}
