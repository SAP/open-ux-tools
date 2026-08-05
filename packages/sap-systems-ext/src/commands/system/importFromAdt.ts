import type { SystemCommandContext } from '../../types/system';
import { BackendSystem, isSystemNameInUse } from '@sap-ux/store';
import { commands, window, type QuickPickItem } from 'vscode';
import { t, resolveAdtDestinations, type AdtDestinationHttpDetails } from '../../utils';
import { TelemetryHelper } from '../../utils';
import { SystemAction, SystemActionStatus, SystemCommands, SYSTEMS_EVENT } from '../../utils/constants';

/**
 * Returns a command handler that lets the user pick an ABAP destination (resolved via the ADT
 * extension, or the local ~/.adtls/destinations.json fallback), opens it pre-filled in the system
 * edit webview via the existing "create system" command, and then prompts for the password.
 *
 * @param _commandContext - the system command context (unused; the panel is opened via a command)
 * @returns - a command handler function
 */
export const importFromAdtCommandHandler = (_commandContext: SystemCommandContext) => async (): Promise<void> => {
    try {
        const destinations = await resolveAdtDestinations();
        const importable = destinations.filter((d) => !!d.url);
        if (importable.length === 0) {
            window.showInformationMessage(
                destinations.length === 0 ? t('info.adtImport.noDestinations') : t('info.adtImport.noneImported')
            );
            return;
        }

        const selected = await pickDestination(importable);
        if (!selected) {
            // user cancelled the picker
            return;
        }

        // A system name (the destination id) that is already in use would be rejected on save with a
        // "connection name already exists" error, so tell the user up-front instead of opening the panel.
        if (await isSystemNameInUse(selected.id)) {
            window.showInformationMessage(t('info.adtImport.alreadyExists', { system: selected.id }));
            return;
        }

        const backendSystem = toBackendSystem(selected);
        // Reuse the public "create system" command, which opens the edit webview pre-filled.
        await commands.executeCommand(SystemCommands.Create, backendSystem);

        // Destinations carry no password (RFC/SSO based); prompt the user to add it for this system.
        window.showInformationMessage(t('info.adtImport.enterPassword', { system: backendSystem.name }));
        logImportTelemetry(SystemActionStatus.IMPORT_SUCCESS);
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        window.showErrorMessage(t('error.adtImportFailed', { error }));
        logImportTelemetry(SystemActionStatus.IMPORT_FAIL);
    }
};

/**
 * Presents a quick pick of importable destinations and returns the chosen one.
 *
 * @param destinations - destinations that have a resolved HTTPS url
 * @returns the selected destination, or undefined if the user cancelled
 */
async function pickDestination(
    destinations: AdtDestinationHttpDetails[]
): Promise<AdtDestinationHttpDetails | undefined> {
    const items: (QuickPickItem & { dest: AdtDestinationHttpDetails })[] = destinations.map((dest) => ({
        label: dest.id,
        description: dest.url,
        dest
    }));
    const picked = await window.showQuickPick(items, {
        title: t('info.adtImport.pickTitle'),
        placeHolder: t('info.adtImport.pickPlaceholder'),
        ignoreFocusOut: true
    });
    return picked?.dest;
}

/**
 * Maps a resolved ADT destination to a {@link BackendSystem} for an on-premise ABAP system. The
 * destination id is used as the system name and the destination user as the (display) user; no
 * password is available from the destination, so it must be entered by the user afterwards.
 *
 * @param dest - the resolved destination (guaranteed to have a `url`)
 * @returns the backend system to pre-fill the panel with
 */
function toBackendSystem(dest: AdtDestinationHttpDetails): BackendSystem {
    // `url` presence is guaranteed by the caller's filter.
    const url = dest.url as string;
    return new BackendSystem({
        name: dest.id,
        url,
        client: dest.client,
        username: dest.user,
        userDisplayName: dest.user,
        // 'OnPrem' is the store's system type for ABAP on-premise; 'abap_catalog' its connection type.
        // Bare strings are used here (matching import.ts) because the store enums are not present in test mocks.
        systemType: 'OnPrem',
        connectionType: 'abap_catalog',
        systemInfo:
            dest.systemId || dest.client ? { systemId: dest.systemId ?? '', client: dest.client ?? '' } : undefined
    });
}

/**
 * Logs telemetry for the ADT import action.
 *
 * @param status - the import action status
 */
function logImportTelemetry(status: SystemActionStatus): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    TelemetryHelper.sendTelemetry(SYSTEMS_EVENT, {
        action: SystemAction.SYSTEM,
        status
    });
}
