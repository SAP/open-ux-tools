import { isAppStudio } from '@sap-ux/btp-utils';

import type ConfigInfoPrompter from '../config';
import { ConfigurationInfoAnswers } from '../../../../types';

/**
 * Determines if an extension project is allowed based on the application details and specific conditions.
 *
 * @param {ConfigurationInfoAnswers} answers - The user-provided answers containing application details.
 * @param {ConfigInfoPrompter} prompter - The instance responsible for providing configuration and system information.
 * @returns {boolean | undefined} True if an extension project is allowed, otherwise false or undefined based on the conditions evaluated.
 */
export function whenExtensionProjectAllowed(
    answers: ConfigurationInfoAnswers,
    prompter: ConfigInfoPrompter
): boolean | undefined {
    return answers.application && allowExtensionProject(prompter);
}

/**
 * Evaluates if an extension project setup is permissible under the current system and project conditions.
 *
 * @param {ConfigInfoPrompter} prompter - The instance managing and providing system and project configuration details.
 * @returns {boolean | undefined} True if an extension project is permissible under specific conditions.
 */
export function allowExtensionProject(prompter: ConfigInfoPrompter): boolean | undefined {
    if (prompter.isCloudProject) {
        return false;
    }

    const isOnPremiseAppStudio = prompter.flexUISystem?.isOnPremise && isAppStudio();
    const nonFlexOrNonOnPremise =
        prompter.flexUISystem && (!prompter.flexUISystem.isOnPremise || !prompter.flexUISystem.isUIFlex);

    return (
        isOnPremiseAppStudio &&
        (!prompter.isApplicationSupported ||
            (prompter.isApplicationSupported && (nonFlexOrNonOnPremise || prompter.appIdentifier.appSync)))
    );
}
