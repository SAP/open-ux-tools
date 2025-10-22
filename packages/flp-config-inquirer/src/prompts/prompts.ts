import type { ManifestNamespace } from '@sap-ux/project-access';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

import {
    getSemanticObjectPrompt,
    getActionPrompt,
    getTitlePrompt,
    getSubTitlePrompt,
    getOverwritePrompt,
    getInboundIdsPrompt,
    getParameterStringPrompt,
    getIconPrompt,
    getExistingFlpConfigInfoPrompt,
    getTileSettingsPrompts
} from './questions';
import { promptNames } from '../types';
import type {
    ExistingInboundRef,
    FLPConfigPromptOptions,
    FLPConfigQuestion,
    TileSettingsAnswers,
    OnActionSelect
} from '../types';
import type { YUIQuestion } from '@sap-ux/inquirer-common';

/**
 * Generates a list of prompts for FLP (Fiori Launchpad) configuration.
 *
 * This function creates a set of prompts tailored for configuring FLP inbound navigation, including prompts
 * for inbound IDs, semantic objects, actions, titles, subtitles, and overwrite options. The behavior of the
 * prompts can be customized through the provided `promptOptions` parameter.
 *
 * @param {ManifestNamespace.Inbound | undefined} [inbounds] - Existing inbounds for the application, if any.
 * @param {FLPConfigPromptOptions | undefined} [promptOptions] - Optional configuration to control prompt behavior and defaults.
 * @returns {FLPConfigQuestion[]} An array of FLPConfigQuestion objects to be used for prompting the user.
 */
export function getQuestions(
    inbounds?: ManifestNamespace.Inbound,
    promptOptions?: FLPConfigPromptOptions
): FLPConfigQuestion[] {
    const inboundKeys = Object.keys(inbounds ?? {});
    const isCLI = getHostEnvironment() === hostEnvironment.cli;
    const existingKeyRef: ExistingInboundRef = { value: false };
    const silentOverwrite = promptOptions?.silentOverwrite ?? false;

    const keyedPrompts: Record<promptNames, FLPConfigQuestion> = {
        [promptNames.existingFlpConfigInfo]: getExistingFlpConfigInfoPrompt(isCLI),
        [promptNames.inboundId]: getInboundIdsPrompt(inbounds ?? {}),
        [promptNames.semanticObject]: getSemanticObjectPrompt(isCLI, promptOptions?.[promptNames.semanticObject]),
        [promptNames.action]: getActionPrompt(isCLI, promptOptions?.[promptNames.action], inbounds),
        [promptNames.overwrite]: getOverwritePrompt(
            inboundKeys,
            isCLI,
            existingKeyRef,
            promptOptions?.[promptNames.overwrite]
        ),
        [promptNames.title]: getTitlePrompt(existingKeyRef, silentOverwrite, isCLI, promptOptions?.[promptNames.title]),
        [promptNames.subTitle]: getSubTitlePrompt(
            existingKeyRef,
            silentOverwrite,
            promptOptions?.[promptNames.subTitle]
        ),
        [promptNames.icon]: getIconPrompt(promptOptions?.[promptNames.icon]),
        [promptNames.additionalParameters]: getParameterStringPrompt()
    };

    const questions: FLPConfigQuestion[] = Object.entries(keyedPrompts)
        .filter(([promptName]) => {
            const option = promptOptions?.[promptName as promptNames];
            return option && 'hide' in option ? !option.hide : true;
        })
        .map(([_, prompt]) => prompt);

    return questions;
}

/**
 * Generates a list of prompts for configuring tile settings in the FLP configuration.
 *
 * @param {ManifestNamespace.Inbound} inbounds - Existing inbounds for the application.
 * @param {FLPConfigPromptOptions} [promptOptions] - Optional configuration to control prompt behavior and defaults.
 * @param {OnActionSelect} onActionSelect - Callback function to handle changes in tile settings.
 * @returns {YUIQuestion<TileSettingsAnswers>[] | FLPConfigQuestion[]} An array of questions for tile settings.
 */
export function getTileSettingsQuestions(
    inbounds: ManifestNamespace.Inbound,
    promptOptions?: FLPConfigPromptOptions,
    onActionSelect?: OnActionSelect
): YUIQuestion<TileSettingsAnswers>[] {
    const isCLI = getHostEnvironment() === hostEnvironment.cli;
    const questions = getTileSettingsPrompts(inbounds, onActionSelect);
    if (!promptOptions?.existingFlpConfigInfo?.hide) {
        questions.unshift(getExistingFlpConfigInfoPrompt(isCLI) as YUIQuestion);
    }
    return questions;
}
