import type { BackendSystem } from '@sap-ux/store';
import type { TOptions } from 'i18next';
import type { ConfirmationPromptType } from './constants';

import { t } from './i18n';
import { confirmationPromptMap } from './constants';
import { window } from 'vscode';

/**
 * Returns a display name for the backend system.
 *
 * @param system - The backend system object.
 * @returns - A string representing the display name of the system, including its type and user display name if available.
 */
export function getDisplayName(system: BackendSystem): string {
    const userDisplayName = system.userDisplayName ? ` [${system.userDisplayName}]` : '';
    return `${system.name}${userDisplayName}`;
}

/**
 * Warning message displayed to confirm user's intent.
 *
 * @param confirmPromptType - type of prompt : overwrite / delete
 * @param systemName - name of system
 * @returns boolean - confirmation if yes is selected or not
 */
export async function confirmPrompt(confirmPromptType: ConfirmationPromptType, systemName: string): Promise<boolean> {
    let confirm: string | undefined;
    const yes = t('confirmationPrompt.yes');
    const no = t('confirmationPrompt.no');
    const i18nkey = confirmationPromptMap.get(confirmPromptType);

    if (i18nkey) {
        confirm = await window.showWarningMessage(
            t(i18nkey, geti18nOpts(systemName)),
            {
                modal: true
            },
            yes,
            no
        );
    }
    return confirm === yes;
}

/**
 * Small helper to get i18n options for the deletion messages.
 *
 * @param systemName - the name of the system being deleted
 * @returns - the i18n options with the system name
 */
export function geti18nOpts(systemName: string): TOptions {
    return {
        interpolation: { escapeValue: false },
        system: systemName
    };
}
