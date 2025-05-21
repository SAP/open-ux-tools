/**
 * Validates the metadata file, returning an error string, if not valid, or an object with the valid metadata and version.
 *
 * @param path
 * @param odataVersion
 * @returns
 */

import { OdataVersion } from '@sap-ux/odata-service-writer';
import { readFile } from 'fs/promises';
import { validateODataVersion } from '../../validators';
import { t } from '../../../i18n';

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
        let metadata = await readFile(path, 'utf-8');
        metadata = metadata.replace(/ & /g, ' &amp; ');
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
