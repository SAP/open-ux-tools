import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { getConfirmConfigUpdatePrompt } from '@sap-ux/deploy-config-generator-shared';
import type { Question } from 'inquirer';
import type { DeployConfigOptions } from '../types';

/**
 * Get prompt to confirm the configuration is to be updated.
 *
 * @param launchStandaloneFromYui - is generator launched from another generator
 * @param opts - the prompt opts for the confirm config update prompt
 * @param opts.show Whether the prompt should be shown.
 * @param opts.configType The type of configuration being updated. This will be added to the start of the prompt message.
 * @returns List of Questions
 */
export function getConfirmConfigUpdatePrompts(
    launchStandaloneFromYui: boolean,
    { show = undefined, configType = undefined }: DeployConfigOptions['confirmConfigUpdate'] = {}
): Question[] {
    const configUpdatePrompts: Question[] = [];
    // Show confirm prompt only if launched standalone or on CLI since Fiori gen will show UI warn message in previous step
    if ((getHostEnvironment() === hostEnvironment.cli || launchStandaloneFromYui) && show) {
        configUpdatePrompts.push(...getConfirmConfigUpdatePrompt(configType));
    }
    return configUpdatePrompts;
}
