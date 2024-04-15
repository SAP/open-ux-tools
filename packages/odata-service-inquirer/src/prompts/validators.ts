import { readFile } from 'fs/promises';
import { t } from '../i18n';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { MetadataFactory } from '@sap/wing-service-explorer';
import LoggerHelper from './logger-helper';

/**
 * Validator function to verify if the specified metadata edmx version matches the specified required odata version.
 *
 * @param edmx
 * @param requiredVersion
 * @throws Parse error, if the edmx is unparseable
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

/**
 * Validates the metadata file, returning an error string, if not valid, or an object with the valid metadata and version.
 *
 * @param path
 * @param odataVersion
 * @returns
 */

export const validateMetadataFile = async (
    path: string,
    odataVersion?: OdataVersion
): Promise<
    | {
          version: OdataVersion;
          metadata: string;
      }
    | string
    | boolean
> => {
    if (!path) {
        return false;
    }

    try {
        const metadata = await readFile(path, 'utf-8');
        metadata.replace(/ & /g, ' &amp; ');
        const { validationMsg, version } = validateODataVersion(metadata, odataVersion);
        if (validationMsg) {
            return validationMsg;
        }
        return {
            version: version ?? OdataVersion.v4,
            metadata
        };
    } catch (error) {
        return t('prompts.validationMessages.metadataFilePathNotValid');
    }
};
