import { readFile } from 'fs/promises';
import { t } from '../i18n';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { MetadataFactory } from '@sap/wing-service-explorer';
import LoggerHelper from './logger-helper';
import { PromptStateHelper } from './prompt-helpers';

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

export const validateMetadataFile = async (path: string, odataVersion?: OdataVersion): Promise<boolean | string> => {
    if (!path) {
        return false;
    }

    try {
        const metadataFile = await readFile(path, 'utf-8');
        metadataFile.replace(/ & /g, ' &amp; ');
        const { validationMsg, version } = validateODataVersion(metadataFile, odataVersion);
        if (validationMsg) {
            return validationMsg;
        }
        PromptStateHelper.odataService.metadata = metadataFile;
        PromptStateHelper.odataService.odataVersion = version;
    } catch (error) {
        return t('prompts.validationMessages.metadataFilePathNotValid');
    }
    return true;
    /*  if (existsSync(path) && statSync(path).isFile()) {
            // Will remove existsSync and use statSync(path, { throwIfNoEntry: false }, when min node version > 14
            // Exists and is a file
            service.edmx = readFileSync(path, 'utf-8');
            service.edmx = service.edmx.replace(/ & /g, ' &amp; ');
            const { validationMsg, version } = validateODataVersion(service.edmx, requiredVersion);

            if (validationMsg) {
                delete service.edmx;
                return validationMsg;
            }
            service.servicePath = t('EXAMPLE_URL_PATH'); // Dummy path used by v4 preview server middleware
            service.version = version;
            return true;
        } else {
            return t('ERROR_METADATA_FILE_DOES_NOT_EXIST');
        }*/
};
