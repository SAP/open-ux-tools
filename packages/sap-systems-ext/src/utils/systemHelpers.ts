import type { TOptions } from 'i18next';
import type { ConfirmationPromptType } from './constants';

import { t } from './i18n';
import { confirmationPromptMap } from './constants';
import { window } from 'vscode';
import type { BackendSystem } from '@sap-ux/store';

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

/**
 * Get the system display name.
 *
 * @param system - backend system
 * @returns system display name
 */
export function getDisplayName(system: BackendSystem): string {
    const userDisplayName = system.userDisplayName ? ` [${system.userDisplayName}]` : '';
    return `${system.name}${getSystemTypeLabel(system.systemType)}${userDisplayName}`;
}

/**
 * Returns the formatted system type name for the given backend system.
 * Copy from fiori-generator-shared to avoid issues with bundling.
 *
 * @param systemType the system type to get the parenthesised name for
 * @returns system type name formatted as a string, e.g. " (ABAP Cloud)".
 */
function getSystemTypeLabel(systemType?: string): string {
    let systemTypeName = ''; // for on prem we do not show the system type
    const abapCloudLabel = ` (${t('views.systemType.abapCloud')})`;
    // Legacy store system types will now display as ABAP Cloud
    if (systemType === 'AbapCloud' || systemType === 'S4HC' || systemType === 'BTP') {
        systemTypeName = abapCloudLabel;
    }
    return systemTypeName;
}
