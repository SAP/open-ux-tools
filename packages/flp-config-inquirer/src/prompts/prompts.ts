import {
    getSemanticObjectPrompt,
    getActionPrompt,
    getTitlePrompt,
    getSubTitlePrompt,
    getOverwritePrompt
} from './questions/basic';
import { promptNames } from '../types';
import { PLATFORMS, getPlatform } from './utils';
import type { ExistingInboundRef, FLPConfigPromptOptions, FLPConfigQuestion } from '../types';

/**
 * Generates a list of prompts for FLP (Fiori Launchpad) configuration.
 *
 * @param {string[]} [inboundKeys] - An array of existing inbound keys to check for duplicates.
 * @param {FLPConfigPromptOptions} [promptOptions] - Optional configuration to control prompt behavior and defaults.
 * @returns {FLPConfigQuestion[]} An array of FLPConfigQuestion objects to be used for prompting the user.
 */
export function getQuestions(inboundKeys: string[] = [], promptOptions?: FLPConfigPromptOptions): FLPConfigQuestion[] {
    const isCLI = getPlatform() === PLATFORMS.CLI;
    const existingKeyRef: ExistingInboundRef = { value: false };
    const silentOverwrite = promptOptions?.silentOverwrite ?? false;

    const keyedPrompts: Record<promptNames, FLPConfigQuestion> = {
        [promptNames.semanticObject]: getSemanticObjectPrompt(promptOptions?.[promptNames.semanticObject]),
        [promptNames.action]: getActionPrompt(promptOptions?.[promptNames.action]),
        [promptNames.overwrite]: getOverwritePrompt(
            inboundKeys,
            isCLI,
            existingKeyRef,
            promptOptions?.[promptNames.overwrite]
        ),
        [promptNames.title]: getTitlePrompt(existingKeyRef, silentOverwrite, promptOptions?.[promptNames.title]),
        [promptNames.subTitle]: getSubTitlePrompt(
            existingKeyRef,
            silentOverwrite,
            promptOptions?.[promptNames.subTitle]
        )
    };

    const questions: FLPConfigQuestion[] = [
        keyedPrompts[promptNames.semanticObject],
        keyedPrompts[promptNames.action],
        keyedPrompts[promptNames.overwrite],
        keyedPrompts[promptNames.title],
        keyedPrompts[promptNames.subTitle]
    ];

    return questions;
}
