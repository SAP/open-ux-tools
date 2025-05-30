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
    getExistingFlpConfigInfoPrompt
} from './questions';
import { promptNames } from '../types';
import type { ExistingInboundRef, FLPConfigPromptOptions, FLPConfigQuestion } from '../types';

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
        [promptNames.action]: getActionPrompt(isCLI, promptOptions?.[promptNames.action]),
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
        [promptNames.additionalParameters]: getParameterStringPrompt(inbounds)
    };

    const questions: FLPConfigQuestion[] = Object.entries(keyedPrompts)
        .filter(([promptName]) => {
            const option = promptOptions?.[promptName as promptNames];
            return option && 'hide' in option ? !option.hide : true;
        })
        .map(([_, prompt]) => prompt);

    return questions;
}
