import { Uri, window, type WorkspaceFolder } from 'vscode';
import { join } from 'node:path';

/**
 * Displays the save dialog to the user.
 *
 * @param systemName name of the system
 * @param workspaceFolders - the workspace folders
 * @returns file path
 */
export async function showFileSaveDialog(
    systemName?: string,
    workspaceFolders?: readonly WorkspaceFolder[]
): Promise<Uri | undefined> {
    // replace forward slashes with underscores, and only allow alphanumeric characters, dots, and dashes in the file name
    const sanitizedSystemName = systemName?.replaceAll(/[:,]/g, '_').replaceAll(/[^a-zA-Z0-9._-]+/g, '') ?? 'system';
    const fileName = `${sanitizedSystemName}.json`;
    // If there are any workspace folders (0-N) the path will default to the [0] folder open
    // or else it will open the home directory
    const defaultUri = workspaceFolders?.[0]?.uri?.fsPath
        ? Uri.file(join(workspaceFolders[0].uri.fsPath, fileName))
        : Uri.file(fileName);

    const filePath = await window.showSaveDialog({
        defaultUri,
        filters: { 'JSON Files': ['json'] }
    });

    return filePath;
}
