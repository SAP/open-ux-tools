import { findProjectRoot, getCapProjectType } from '@sap-ux/project-access';
import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { type Question } from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import { getQuestions } from './prompts';
import { type InquirerAdapter, type UI5ApplicationAnswers, type UI5ApplicationPromptOptions } from './types';
import { cleanPromptOptions } from './prompts/utility';
import cloneDeep from 'lodash/cloneDeep';

/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param promptOptions See {@link UI5ApplicationPromptOptions} for details
 * @param [isCli] Changes some prompt logic for YUI execution otherwise prompts will be executed serially in a command line environment
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(
    promptOptions?: UI5ApplicationPromptOptions,
    isCli = true
): Promise<Question<UI5ApplicationAnswers>[]> {
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        includeMaintained: true,
        includeDefault: true
    };
    const ui5Versions = await getUI5Versions(filterOptions);
    let isCapProject = false;

    const promptOptionsClean = cleanPromptOptions(cloneDeep(promptOptions));

    if (promptOptionsClean?.targetFolder?.value) {
        // Is this a cap project, target dir will be set to the `app` or custom app folder not the project root
        isCapProject = !!(await getCapProjectType(
            await findProjectRoot(promptOptionsClean.targetFolder?.value, false, true)
        ));
    }
    /*  const ui5LibPromptInputs: UI5ApplicationPromptOptions = {
        targetFolder: promptOptions?.targetFolder,
        includeSeparators: promptOptions?.includeSeparators,
        useAutocomplete: promptOptions?.useAutocomplete
    }; */

    return getQuestions(ui5Versions, promptOptionsClean, isCli, isCapProject);
}

/**
 * Prompt for ui5 application writer inputs.
 *
 * @param promptOptions - options that can control some of the prompt behavior. See {@link UI5ApplicationPromptOptions} for details
 * @param adapter - optionally provide references to a calling inquirer instance, this supports integration to Yeoman generators, for example
 * @returns the prompt answers
 */
async function prompt(
    promptOptions: UI5ApplicationPromptOptions,
    adapter: InquirerAdapter
): Promise<UI5ApplicationAnswers> {
    /*     const input: UI5ApplicationPromptOptions = {
        [promptNames.ui5Version]: {
            hide: false,
            minUI5Version: '1.120.0',
            includeSeparators: true,
            useAutocomplete: true,
            value: '1.120.0'
        },
        [promptNames.addDeployConfig]: {
            value: true,
            validatorCallback: (a, b: string) => {
                //do something in YUI
            },
        },
        [promptNames.name]: {
            value: 'some prompt'
        }
    } */

    const ui5AppPrompts = await exports.getPrompts(promptOptions);

    if (adapter?.promptModule && promptOptions.ui5Version?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }

    return adapter.prompt(ui5AppPrompts);
}

export { getPrompts, prompt, type UI5ApplicationAnswers, type UI5ApplicationPromptOptions };
