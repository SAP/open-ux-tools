import { handleWorkspaceConfig } from '../../src/debug-config/workspaceManager';
import {
    formatCwd,
    getLaunchJsonPath,
    isFolderInWorkspace,
    handleAppsNotInWorkspace
} from '../../src/debug-config/helpers';
import type { DebugOptions } from '../../src/types';
import path from 'path';

// Mock the helpers
jest.mock('../../src/debug-config/helpers', () => ({
    formatCwd: jest.fn(),
    handleAppsNotInWorkspace: jest.fn(),
    getLaunchJsonPath: jest.fn(),
    isFolderInWorkspace: jest.fn()
}));

// Mock the path module
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    relative: jest.fn()
}));

describe('launchConfig Unit Tests', () => {
    const isAppStudio = false;
    const mockVscode = {
        workspace: {
            getWorkspaceFolder: jest.fn(),
            workspaceFolders: [],
            workspaceFile: { scheme: 'file' }
        },
        Uri: {
            file: jest.fn((f: string) => ({ fsPath: f }))
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleOpenFolderButNoWorkspaceFile', () => {
        it('should create a launch config for non-workspace apps if folder is not in workspace', () => {
            const mockProjectPath = '/mock/project/path';
            (isFolderInWorkspace as jest.Mock).mockReturnValue(false);
            (handleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const options = {
                projectPath: mockProjectPath,
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;

            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
        });

        it('should update paths for nested folders inside an open folder', () => {
            const mockProjectPath = '/mock/project/nestedFolder';
            const mockTargetFolder = '/target/folder';
            const mockNestedFolder = 'nestedFolder';

            (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
            (path.relative as jest.Mock).mockReturnValue(mockNestedFolder);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/nestedFolder');
            (getLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            const options = {
                projectPath: mockProjectPath,
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;

            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/nestedFolder'
            });
        });
    });

    describe('handleSavedWorkspace', () => {
        it('should handle projects inside the workspace', () => {
            const mockProjectPath = '/mock/project/path';
            const mockTargetFolder = '/target/folder';
            (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/project');
            (getLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            const options = {
                projectPath: mockProjectPath,
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;
            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/project'
            });
        });

        it('should create a launch config for non-workspace apps', () => {
            const mockProjectPath = '/mock/project/path';
            (isFolderInWorkspace as jest.Mock).mockReturnValue(false);
            (handleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const options = {
                projectPath: mockProjectPath,
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;
            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
        });
    });

    describe('handleUnsavedWorkspace', () => {
        it('should update paths for nested folders inside a workspace', () => {
            const mockProjectPath = '/mock/project/nestedFolder';
            const mockWsFolder = '/mock/workspace/folder';
            const mockNestedFolder = 'nestedFolder';
            mockVscode.workspace.getWorkspaceFolder.mockReturnValue({ uri: { fsPath: mockWsFolder } });
            mockVscode.workspace.workspaceFile.scheme = 'folder';
            (path.relative as jest.Mock).mockReturnValue(mockNestedFolder);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/nestedFolder');
            const options = {
                projectPath: mockProjectPath,
                vscode: mockVscode
            } as DebugOptions;
            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockWsFolder,
                cwd: '${workspaceFolder}/nestedFolder'
            });
        });
    });

    describe('handleWorkspaceConfig', () => {
        it('should handle writeToAppOnly option', () => {
            const mockProjectPath = '/mock/project/path';
            const options = {
                projectPath: mockProjectPath,
                writeToAppOnly: true,
                vscode: mockVscode
            } as DebugOptions;

            (handleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
            expect(handleAppsNotInWorkspace).toHaveBeenCalledWith(mockProjectPath, isAppStudio, mockVscode);
        });

        it('should handle open folder but no workspace file case', () => {
            const mockProjectPath = '/mock/project/path';
            const mockTargetFolder = '/target/folder';
            const options = {
                projectPath: mockProjectPath,
                vscode: {
                    ...mockVscode,
                    workspace: { ...mockVscode.workspace, workspaceFile: undefined }
                }
            } as DebugOptions;

            // Set up mocks for helpers
            (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/path');
            (getLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            // Call the function under test
            const result = handleWorkspaceConfig(options);

            // Assertions
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/path'
            });

            // Verify if handleOpenFolderButNoWorkspaceFile was called correctly indirectly
            const expectedLaunchJsonPath = getLaunchJsonPath(mockVscode.workspace.workspaceFolders) ?? mockTargetFolder;
            const expectedCwd = formatCwd(path.relative(mockTargetFolder, mockProjectPath));

            expect(result.launchJsonPath).toBe(expectedLaunchJsonPath);
            expect(result.cwd).toBe(expectedCwd);
        });

        it('should handle no workspace case', () => {
            const mockProjectPath = '/mock/project/path';
            const options = {
                projectPath: mockProjectPath,
                vscode: { ...mockVscode, workspace: undefined }
            } as DebugOptions;
            (handleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
            expect(handleAppsNotInWorkspace).toHaveBeenCalledWith(mockProjectPath, isAppStudio, options.vscode);
        });

        it('should handle saved workspace case', () => {
            const mockProjectPath = '/mock/project/path';
            const mockTargetFolder = '/target/folder';
            const mockVscode = {
                workspace: {
                    getWorkspaceFolder: jest.fn().mockReturnValue({ uri: { fsPath: mockTargetFolder } }),
                    workspaceFile: { scheme: 'file' }
                }
            };
            // Prepare options for the test
            const options = {
                projectPath: mockProjectPath,
                vscode: mockVscode
            } as DebugOptions;
            // Call the function under test
            const result = handleWorkspaceConfig(options);
            // Assertions
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/path'
            });
        });

        it('should handle unsaved workspace case', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const mockTargetFolder = path.join('/target/folder');
            const mockVscode = {
                workspace: {
                    getWorkspaceFolder: jest.fn().mockReturnValue(undefined),
                    workspaceFile: { scheme: 'unknown' }
                },
                Uri: {
                    file: jest.fn().mockReturnValue({
                        uri: {
                            fsPath: mockTargetFolder
                        }
                    })
                }
            };

            // Prepare options for the test
            const options = {
                projectPath: mockProjectPath,
                vscode: mockVscode
            } as DebugOptions;
            // Call the function under test
            const result = handleWorkspaceConfig(options);
            // Assertions
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}/path'
            });
        });
    });
});
