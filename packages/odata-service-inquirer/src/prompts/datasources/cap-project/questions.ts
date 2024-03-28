import type { ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../../i18n';
import type { CapProjectChoice, CapProjectPromptOptions } from '../../../types';
import { promptNames, type OdataServiceAnswers } from '../../../types';
import { getCapWorkspaceChoices } from './cap-helper';

/**
 * Get the prompt for selecting a CAP project.
 *
 * @param promptOptions - The prompt options which control CAP project search paths and default value
 * @returns the prompt used to provide input for selecting a CAP project
 */
export async function getLocalCapProjectPrompt(
    promptOptions?: CapProjectPromptOptions
): Promise<YUIQuestion<OdataServiceAnswers>> {
    const capChoices = await getCapWorkspaceChoices(promptOptions?.capSearchPaths ?? [process.cwd()]);
    const defaultCapService = promptOptions?.default;
    //let validCapPath = false;

    return {
        when: (): boolean => capChoices?.length > 0,
        type: 'list',
        name: promptNames.capProject,
        message: t('prompts.capProject.message'),
        default: () => defaultCapService ?? 0, // todo: is zero necesary, wont it always default to the first entry?
        choices: () => capChoices,
        guiOptions: {
            applyDefaultWhenDirty: true,
            mandatory: true,
            breadcrumb: t('prompts.capProject.breadcrumb')
        },
        validate: (capChoiceValue: CapProjectChoice['value']): boolean => {
            if (typeof capChoiceValue === 'object' && capChoiceValue?.path) {
                //validCapPath = true;
                return true;
            }
            return false;
        }
    } as ListQuestion<OdataServiceAnswers>;
}
