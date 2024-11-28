import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

import {
    getSemanticObjectPrompt,
    getActionPrompt,
    getTitlePrompt,
    getSubTitlePrompt,
    getOverwritePrompt
} from './questions/basic';
import { promptNames } from '../types';
import type { ExistingInboundRef, FLPConfigPromptOptions, FLPConfigQuestion } from '../types';
import {
    getConfigurationModePrompt,
    getCreateAnotherInboundPrompt,
    getInboundIdsPrompt,
    getParameterStringPrompt
} from './questions/advanced';
import { ManifestNamespace } from '@sap-ux/project-access';

/**
 * Generates a list of prompts for FLP (Fiori Launchpad) configuration.
 *
 * @param {ManifestNamespace.Inbound | undefined} [inbounds] - Existing inbounds for an application.
 * @param {FLPConfigPromptOptions} [promptOptions] - Optional configuration to control prompt behavior and defaults.
 * @returns {FLPConfigQuestion[]} An array of FLPConfigQuestion objects to be used for prompting the user.
 */
export function getQuestions(
    inbounds: ManifestNamespace.Inbound | undefined,
    promptOptions?: FLPConfigPromptOptions
): FLPConfigQuestion[] {
    const inboundKeys = Object.keys(inbounds ?? {});
    const isCLI = getHostEnvironment() === hostEnvironment.cli;
    const existingKeyRef: ExistingInboundRef = { value: false };
    const silentOverwrite = promptOptions?.silentOverwrite ?? false;

    const keyedPrompts: Record<promptNames, FLPConfigQuestion> = {
        [promptNames.configurationMode]: getConfigurationModePrompt(
            inboundKeys,
            promptOptions?.[promptNames.configurationMode]
        ),
        [promptNames.inboundId]: getInboundIdsPrompt(inboundKeys, promptOptions?.[promptNames.inboundId]),
        [promptNames.semanticObject]: getSemanticObjectPrompt(isCLI, promptOptions?.[promptNames.semanticObject]),
        [promptNames.action]: getActionPrompt(isCLI, promptOptions?.[promptNames.action]),
        [promptNames.overwrite]: getOverwritePrompt(
            inboundKeys,
            isCLI,
            existingKeyRef,
            promptOptions?.[promptNames.overwrite]
        ),
        [promptNames.title]: getTitlePrompt(
            inbounds,
            existingKeyRef,
            silentOverwrite,
            isCLI,
            promptOptions?.[promptNames.title]
        ),
        [promptNames.subTitle]: getSubTitlePrompt(
            inbounds,
            existingKeyRef,
            silentOverwrite,
            promptOptions?.[promptNames.subTitle]
        ),
        [promptNames.parameterString]: getParameterStringPrompt(
            inboundKeys,
            promptOptions?.[promptNames.parameterString]
        ),
        [promptNames.createAnotherInbound]: getCreateAnotherInboundPrompt(
            promptOptions?.[promptNames.createAnotherInbound]
        )
    };

    const questions: FLPConfigQuestion[] = [
        keyedPrompts[promptNames.configurationMode],
        keyedPrompts[promptNames.inboundId],
        keyedPrompts[promptNames.semanticObject],
        keyedPrompts[promptNames.action],
        keyedPrompts[promptNames.overwrite],
        keyedPrompts[promptNames.title],
        keyedPrompts[promptNames.subTitle],
        keyedPrompts[promptNames.parameterString],
        keyedPrompts[promptNames.createAnotherInbound]
    ];

    return questions;
}
