import type { FileBrowserQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../../i18n';
import type { MetadataPromptOptions, OdataServiceAnswers } from '../../../types';
import { promptNames } from '../../../types';
import { validateMetadataFile } from '../../validators';
import { PromptStateHelper } from '../../prompt-helpers';

/**
 * Returns the metadata file question based on the provided @type{MetadataPromptOptions}.
 *
 * @param promptOptions - The metadata prompt options
 * @returns the metadata file question
 */
export function getMetadataFileQuestion(promptOptions?: MetadataPromptOptions): YUIQuestion<OdataServiceAnswers> {
    const metadataFileQuestion = {
        type: 'input',
        guiType: 'file-browser',
        name: promptNames.metadataFilePath,
        guiOptions: { mandatory: true, breadcrumb: true },
        message: t('prompts.metadataFile.message'),
        validate: async (path: string) => {
            PromptStateHelper.reset();
            const validateResult = await validateMetadataFile(path, promptOptions?.requiredOdataVersion);

            if (typeof validateResult === 'string' || typeof validateResult === 'boolean') {
                return validateResult;
            }

            if (validateResult.metadata) {
                PromptStateHelper.odataService = {};
                PromptStateHelper.odataService.odataVersion = validateResult.version;
                PromptStateHelper.odataService.metadata = validateResult.metadata;
                PromptStateHelper.odataService.servicePath = t('prompts.metadataFile.placeholder_odata_service_url'); // Dummy path used by v4 preview server middleware
            }
            return true;
        }
    } as FileBrowserQuestion<OdataServiceAnswers>;

    return metadataFileQuestion;
}
