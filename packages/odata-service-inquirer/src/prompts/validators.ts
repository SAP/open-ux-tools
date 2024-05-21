import { t } from '../i18n';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { MetadataFactory } from '@sap/wing-service-explorer';
import LoggerHelper from './logger-helper';

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
    const metadataFactory = MetadataFactory.getMetadataFactory();
    try {
        const explorer = metadataFactory.getMetadataExplorer(edmx);
        // Wing service explorer does not export the type of the protocol, so we need to check the string
        const version = explorer.getProtocolType().indexOf('v4') > 0 ? OdataVersion.v4 : OdataVersion.v2;

        if (requiredVersion && requiredVersion !== version) {
            const odataErrorMsg = t('prompts.validationMessages.odataVersionMismatch', {
                providedOdataVersion: version,
                requiredOdataVersion: requiredVersion
            });
            LoggerHelper.logger.error(odataErrorMsg);
            return {
                validationMsg: odataErrorMsg
            };
        }
        return {
            version
        };
    } catch (err) {
        return {
            validationMsg: t('prompts.validationMessages.metadataInvalid')
        };
    }
}
