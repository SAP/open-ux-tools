import type { Uri, WorkspaceFolder } from 'vscode';

import {
    existsInWorkspace,
    showWorkspaceFolderWarning,
    handleWorkspaceFolderChoice,
    workspaceChoices
} from '../../../src/utils/workspace';
import { initI18n } from '../../../src/utils/i18n';

describe('workspace', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const mockPath = '/test/path';
    const mockUri = { path: mockPath } as Uri;
    const mockVscode = {
        Uri: {
            file: jest.fn().mockReturnValue(mockUri)
        },
        workspace: {
            getWorkspaceFolder: jest.fn(),
            workspaceFolders: [] as WorkspaceFolder[],
            onDidChangeWorkspaceFolders: jest.fn(),
            updateWorkspaceFolders: jest.fn()
        },
        window: {
            showWarningMessage: jest.fn()
        },
        commands: {
            executeCommand: jest.fn()
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('existsInWorkspace', () => {
        it('should return true when path exists in workspace', () => {
            mockVscode.workspace.getWorkspaceFolder.mockReturnValue({} as WorkspaceFolder);
            expect(existsInWorkspace(mockVscode, mockPath)).toBe(true);
            expect(mockVscode.Uri.file).toHaveBeenCalledWith(mockPath);
        });

        it('should return false when path does not exist in workspace', () => {
            mockVscode.workspace.getWorkspaceFolder.mockReturnValue(undefined);
            expect(existsInWorkspace(mockVscode, mockPath)).toBe(false);
            expect(mockVscode.Uri.file).toHaveBeenCalledWith(mockPath);
        });
    });

    describe('showWorkspaceFolderWarning', () => {
        it('should show warning message with correct options', async () => {
            const mockChoice = workspaceChoices.OPEN_FOLDER;
            mockVscode.window.showWarningMessage.mockResolvedValue(mockChoice);

            const result = await showWorkspaceFolderWarning(mockVscode, mockPath);

            expect(result).toBe(mockChoice);
            expect(mockVscode.window.showWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining(mockPath),
                { modal: true },
                workspaceChoices.OPEN_FOLDER,
                workspaceChoices.ADD_TO_WORKSPACE
            );
        });

        it('should return undefined when warning is dismissed', async () => {
            mockVscode.window.showWarningMessage.mockResolvedValue(undefined);

            const result = await showWorkspaceFolderWarning(mockVscode, mockPath);

            expect(result).toBeUndefined();
        });
    });

    describe('handleWorkspaceFolderChoice', () => {
        it('should execute open folder command when OPEN_FOLDER is chosen', async () => {
            await handleWorkspaceFolderChoice(mockVscode, mockPath, workspaceChoices.OPEN_FOLDER);

            expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('vscode.openFolder', mockUri);
        });

        it('should add folder to workspace when ADD_TO_WORKSPACE is chosen', async () => {
            mockVscode.workspace.workspaceFolders = [{}, {}] as WorkspaceFolder[];
            mockVscode.workspace.onDidChangeWorkspaceFolders.mockReturnValue({
                dispose: jest.fn()
            });

            await handleWorkspaceFolderChoice(mockVscode, mockPath, workspaceChoices.ADD_TO_WORKSPACE);

            expect(mockVscode.workspace.updateWorkspaceFolders).toHaveBeenCalledWith(2, null, {
                uri: mockUri
            });
        });

        it('should execute app info command after folder is added to workspace', async () => {
            mockVscode.workspace.workspaceFolders = [{}, {}] as WorkspaceFolder[];
            const mockDispose = jest.fn();
            mockVscode.workspace.onDidChangeWorkspaceFolders.mockReturnValue({
                dispose: mockDispose
            });

            await handleWorkspaceFolderChoice(mockVscode, mockPath, workspaceChoices.ADD_TO_WORKSPACE);

            // Simulate the workspace folder change event
            const changeCallback = mockVscode.workspace.onDidChangeWorkspaceFolders.mock.calls[0][0];
            changeCallback();

            expect(mockDispose).toHaveBeenCalled();
            expect(mockVscode.commands.executeCommand).toHaveBeenCalledWith('sap.ux.application.info', {
                fsPath: mockPath
            });
        });

        it('should handle empty workspace folders', async () => {
            mockVscode.workspace.workspaceFolders = [];

            await handleWorkspaceFolderChoice(mockVscode, mockPath, workspaceChoices.ADD_TO_WORKSPACE);

            expect(mockVscode.workspace.updateWorkspaceFolders).toHaveBeenCalledWith(0, null, { uri: mockUri });
            expect(mockVscode.workspace.onDidChangeWorkspaceFolders).not.toHaveBeenCalled();
        });
    });
});
