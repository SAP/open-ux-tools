import { t } from '../i18n';
import type { OdataVersion } from '@sap-ux/odata-service-writer';
import LoggerHelper from './logger-helper';
import { parseOdataVersion } from '../utils';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';

/**
 * Validator function to verify if the specified metadata edmx version matches the specified required odata version.
 * Note that this parses the edmx to determine the odata version and also returns the converted metadata as a side effect to
 * avoid consumers having to parse the edmx again.
 *
 * @param edmx the edmx to validate
 * @param requiredVersion the required odata version to validate against
 * @returns the version only if odata version of the specified edmx matches otherwises the validation error message
 */
export function validateODataVersion(
    edmx: string,
    requiredVersion?: OdataVersion
): { validationMsg?: string; version?: OdataVersion; convertedMetadata?: ConvertedMetadata } {
    try {
        const { convertedMetadata, odataVersion } = parseOdataVersion(edmx);

        if (requiredVersion && requiredVersion !== odataVersion) {
            const odataErrorMsg = t('prompts.validationMessages.odataVersionMismatch', {
                providedOdataVersion: odataVersion,
                requiredOdataVersion: requiredVersion
            });
            LoggerHelper.logger.error(odataErrorMsg);
            return {
                validationMsg: odataErrorMsg
            };
        }
        return {
            version: odataVersion,
            convertedMetadata: convertedMetadata
        };
    } catch (err) {
        return {
            validationMsg: err.message
        };
    }
}
