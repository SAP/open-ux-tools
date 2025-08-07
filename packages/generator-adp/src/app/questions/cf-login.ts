import type { FDCService } from '@sap-ux/adp-tooling';
import { type InputQuestion, type YUIQuestion } from '@sap-ux/inquirer-common';

import { CFUtils } from '@sap-ux/adp-tooling';
import { type CFLoginQuestion, type CFLoginAnswers, cfLoginPromptNames } from '../types';

/**
 * Returns the list of CF-login prompts.
 *
 * @param {any} vscode - The VS Code instance.
 * @param {FDCService} fdcService - The FDC service instance.
 * @param {boolean} isCFLoggedIn - Whether the user is logged in.
 * @returns {CFLoginQuestion[]} The list of CF-login prompts.
 */
export function getPrompts(vscode: any, fdcService: FDCService, isCFLoggedIn: boolean): CFLoginQuestion[] {
    const cfConfig = fdcService.getConfig();

    if (isCFLoggedIn) {
        return [
            getLoggedInInfoPrompt(cfLoginPromptNames.cfLoggedInMainMessage, 'You are currently logged in:'),
            getLoggedInInfoPrompt(cfLoginPromptNames.cfLoggedApiEndpointMessage, `CF API Endpoint: ${cfConfig.url}`),
            getLoggedInInfoPrompt(
                cfLoginPromptNames.cfLoggedInOrganizationMessage,
                `Organization: ${cfConfig.org.name}`
            ),
            getLoggedInInfoPrompt(cfLoginPromptNames.cfLoggedInSpaceMessage, `Space: ${cfConfig.space.name}`),
            getLoggedInInfoPrompt(
                cfLoginPromptNames.cfLoggedInEndingMessage,
                'You can proceed with the project creation.'
            )
        ];
    }

    let isCFLoginSuccessful = false;

    const externalLoginPrompt: InputQuestion<CFLoginAnswers> = {
        type: 'input',
        name: cfLoginPromptNames.cfExternalLogin,
        message: 'Please complete your CF login using the form on the right side.',
        guiOptions: { type: 'label' },
        validate: async (): Promise<boolean | string> => {
            // loop until both org & space appear in the refreshed config
            let result = '';
            const cfg = fdcService.getConfig();
            while (!cfg.org.name && !cfg.space.name) {
                result = (await vscode?.commands.executeCommand('cf.login', 'side')) as string;
                fdcService.loadConfig();
                if (result !== 'OK' || !result) {
                    await CFUtils.cFLogout();
                    return 'Login failed.';
                }
            }
            isCFLoginSuccessful = true;
            return true;
        }
    };

    const successLabelPrompt: InputQuestion<CFLoginAnswers> = {
        type: 'input',
        name: 'cfExternalLoginSuccessMessage',
        message: 'Login successful',
        guiOptions: { type: 'label' },
        when: (): boolean => isCFLoginSuccessful
    };

    return [externalLoginPrompt, successLabelPrompt];
}

/**
 * Returns the logged-in information prompt.
 *
 * @param {keyof CFLoginAnswers} name - The name of the prompt.
 * @param {string} message - The message to display.
 * @returns {YUIQuestion<CFLoginAnswers>} The logged-in information prompt.
 */
function getLoggedInInfoPrompt(name: keyof CFLoginAnswers, message: string): YUIQuestion<CFLoginAnswers> {
    return {
        type: 'input',
        name,
        message,
        guiOptions: { type: 'label' },
        store: false
    } as YUIQuestion<CFLoginAnswers>;
}
