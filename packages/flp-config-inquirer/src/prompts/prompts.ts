import type { FLPConfigPromptOptions, FLPConfigQuestion } from '../types';
import { promptNames } from '../types';
import { PLATFORMS, getPlatform } from './utils';
import {
    getSemanticObjectPrompt,
    getActionPrompt,
    getTitlePrompt,
    getSubTitlePrompt,
    getOverwritePrompt
} from './questions/basic';

/**
 * Function to get all FLP configuration prompts.
 */
export function getQuestions(inboundKeys: string[] = [], promptOptions?: FLPConfigPromptOptions): FLPConfigQuestion[] {
    const isCLI = getPlatform() === PLATFORMS.CLI;
    const existingKeyRef = { value: false };
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
