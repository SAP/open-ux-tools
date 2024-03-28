import type { FileBrowserQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../../i18n';
import type { MetadataPromptOptions, OdataServiceAnswers } from '../../../types';
import { promptNames } from '../../../types';
import { validateMetadataFile } from '../../validators';

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
        name: promptNames.metadata,
        guiOptions: { mandatory: true, breadcrumb: true },
        message: t('prompts.metadata.message'),
        validate: async (path: string) => {
            return validateMetadataFile(path, promptOptions?.requiredOdataVersion);
        }
    } as FileBrowserQuestion<OdataServiceAnswers>;

    return metadataFileQuestion;
}
