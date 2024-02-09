import { getUI5Versions, type UI5VersionFilterOptions } from '@sap-ux/ui5-info';
import { type Question } from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import cloneDeep from 'lodash/cloneDeep';
import { getQuestions } from './prompts';
// import { cleanPromptOptions } from './prompts/utility';
import {
    promptNames,
    type CapCdsInfo,
    type InquirerAdapter,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions
} from './types';

/**
 * Get the inquirer prompts for ui5 library inquirer.
 *
 * @param promptOptions See {@link UI5ApplicationPromptOptions} for details
 * @param [isCli] Changes some prompt logic for YUI execution otherwise prompts will be executed serially in a command line environment
 * @param [capCdsInfo] - optional, additional information about CAP projects which if provided will be used instead of detecting and parsing CAP projects from the file system
 * @returns the prompts used to provide input for ui5 library generation
 */
async function getPrompts(
    promptOptions?: UI5ApplicationPromptOptions,
    isCli = true,
    capCdsInfo?: CapCdsInfo
): Promise<Question<UI5ApplicationAnswers>[]> {
    const filterOptions: UI5VersionFilterOptions = {
        useCache: true,
        includeMaintained: true,
        includeDefault: true
    };
    const ui5Versions = await getUI5Versions(filterOptions);

    const promptOptionsClean = /* cleanPromptOptions( */ cloneDeep(promptOptions); /* ) */
    /* 
    if (!capCdsInfo && promptOptionsClean?.targetFolder?.value) {
        // Is this a cap project, target dir will be set to the `app` or custom app folder not the project root
        const capRootPath = await findProjectRoot(promptOptionsClean.targetFolder?.value, false, true);
        const capProjectType = await getCapProjectType(capRootPath);

        // Additional CAP project info is required for specific prompts
        if (!capCdsInfo && capProjectType === 'CAPNodejs') {
            capCdsInfo = await checkCdsUi5PluginEnabled(
                await findProjectRoot(promptOptionsClean.targetFolder?.value, false, true),
                fs,
                true
            );
        }
        capCdsInfo = Object.assign(capCdsInfo ?? {}, { capProjectType });
    } */

    return getQuestions(ui5Versions, promptOptionsClean, isCli, capCdsInfo);
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
    const ui5AppPrompts = await exports.getPrompts(promptOptions);

    if (adapter?.promptModule && promptOptions.ui5Version?.useAutocomplete) {
        const pm = adapter.promptModule;
        pm.registerPrompt('autocomplete', autocomplete);
    }

    const answers = adapter.prompt<UI5ApplicationAnswers>(ui5AppPrompts);
    // Apply default values to prompts that may not have been executed
    return answers;
}

export {
    getPrompts,
    prompt,
    promptNames,
    type CapCdsInfo,
    type UI5ApplicationAnswers,
    type UI5ApplicationPromptOptions
};
