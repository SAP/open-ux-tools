import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import type { Question } from 'inquirer';

/**
 * Get prompt to confirm the configuration is to be updated.
 *
 * @param launchStandaloneFromYui - is generator launched from another generator
 * @param configUpdatePrompt - the confirm config update prompt
 * @returns - the confirm config update prompt
 */
export function getConfirmConfigUpdatePrompts(
    launchStandaloneFromYui: boolean,
    configUpdatePrompt?: Question
): Question[] {
    const configUpdatePrompts: Question[] = [];
    // Show confirm prompt only if launched standalone or on CLI since Fiori gen will show UI warn message in previous step
    if ((getHostEnvironment() === hostEnvironment.cli || launchStandaloneFromYui) && configUpdatePrompt) {
        configUpdatePrompts.push(configUpdatePrompt);
    }
    return configUpdatePrompts;
}
