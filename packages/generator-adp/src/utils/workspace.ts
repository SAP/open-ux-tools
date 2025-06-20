import type { Uri } from 'vscode';

import { t } from './i18n';

export const workspaceChoices = {
    OPEN_FOLDER: 'Open Folder',
    ADD_TO_WORKSPACE: 'Add Project to Workspace'
} as const;

export type WorkspaceChoice = (typeof workspaceChoices)[keyof typeof workspaceChoices];

/**
 * Checks if a given path exists in the VS Code workspace.
 *
 * @param vscode - The VS Code API instance
 * @param {string} path - The path to check
 * @returns {boolean} True if the path exists in the workspace, false otherwise
 */
export function existsInWorkspace(vscode: any, path: string): boolean {
    const uri = vscode?.Uri?.file(path) as Uri;
    return !!vscode.workspace.getWorkspaceFolder(uri);
}

/**
 * Shows a warning message when a project is not in the workspace.
 *
 * @param vscode - The VS Code API instance
 * @param {string} path - The path of the project
 * @returns {Promise<WorkspaceChoice | undefined>} The user's choice or undefined if dismissed
 */
export async function showWorkspaceFolderWarning(vscode: any, path: string): Promise<WorkspaceChoice | undefined> {
    return vscode.window.showWarningMessage(
        t('prompts.projectNotInWorkspace', { path }),
        { modal: true },
        workspaceChoices.OPEN_FOLDER,
        workspaceChoices.ADD_TO_WORKSPACE
    );
}

/**
 * Handles the user's choice for workspace folder operations.
 *
 * @param vscode - The VS Code API instance
 * @param {string} path - The path of the project
 * @param {WorkspaceChoice} userChoice - The user's choice from the warning dialog
 */
export async function handleWorkspaceFolderChoice(
    vscode: any,
    path: string,
    userChoice: WorkspaceChoice
): Promise<void> {
    const { workspace, commands } = vscode;
    const uri = vscode?.Uri?.file(path) as Uri;

    if (userChoice === workspaceChoices.OPEN_FOLDER) {
        await commands.executeCommand('vscode.openFolder', uri);
    } else {
        const foldersCount = (workspace?.workspaceFolders?.length as number) ?? 0;

        /**
         * If you add project to a plane VS Code instance, VS Code creates a new window with workspace
         * containing the project and the onDidChangeWorkspaceFolders event is not fired.
         * In that case foldersCount is 0.
         */
        if (foldersCount) {
            /**
             * Waits for the folder to be added to the workspace.
             */
            const didChangeWorkspaceFoldersOnce = workspace?.onDidChangeWorkspaceFolders(() => {
                didChangeWorkspaceFoldersOnce.dispose();
                commands.executeCommand('sap.ux.application.info', { fsPath: path });
            });
        }

        workspace.updateWorkspaceFolders(foldersCount, null, {
            uri
        });
    }
}
