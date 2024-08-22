import {
    handleWorkspaceConfig,
    handleUnsavedWorkspace,
    handleSavedWorkspace,
    handleOpenFolderButNoWorkspaceFile,
    handleAppsNotInWorkspace
} from '../../src/debug-config/workspaceManager';
import { formatCwd, getLaunchJsonPath, isFolderInWorkspace } from '../../src/debug-config/helpers';
import type { DebugOptions } from '../../src/types';
import path from 'path';

// Mock the helpers
jest.mock('../../src/debug-config/helpers', () => ({
    formatCwd: jest.fn(),
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

    describe('handleUnsavedWorkspace', () => {
        it('should update paths for nested folders inside a workspace', () => {
            const mockProjectPath = '/mock/project/nestedFolder';
            const mockWsFolder = '/mock/workspace/folder';
            const mockNestedFolder = 'nestedFolder';
            mockVscode.workspace.getWorkspaceFolder.mockReturnValue({ uri: { fsPath: mockWsFolder } });
            (path.relative as jest.Mock).mockReturnValue(mockNestedFolder);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/nestedFolder');

            const result = handleUnsavedWorkspace(mockProjectPath, mockVscode);
            expect(result).toEqual({
                launchJsonPath: mockWsFolder,
                cwd: '${workspaceFolder}/nestedFolder'
            });
        });
    });

    // Test for create launch config outside workspace
    describe('handleAppsNotInWorkspace', () => {
        it('should create a launch config for non-workspace apps', () => {
            const mockProjectPath = '/mock/project/path';
            const result = handleAppsNotInWorkspace(mockProjectPath, isAppStudio, mockVscode);
            expect(result.cwd).toBe('');
            expect(result.launchJsonPath).toBe(
                path.join(path.dirname(mockProjectPath), path.basename(mockProjectPath))
            );
            expect(result.workspaceFolderUri).toEqual({
                path: path.join(path.dirname(mockProjectPath), path.basename(mockProjectPath))
            });
        });

        it('should handle cases where vscode.Uri is not available', () => {
            const mockProjectPath = '/mock/project/path';
            const result = handleAppsNotInWorkspace(mockProjectPath, isAppStudio, {});
            expect(result.cwd).toBe('${workspaceFolder}');
            expect(result.launchJsonPath).toBe(
                path.join(path.dirname(mockProjectPath), path.basename(mockProjectPath))
            );
            expect(result.workspaceFolderUri).toBeUndefined();
        });

        it('should handle cases where isAppStudio is true', () => {
            const mockProjectPath = '/mock/project/path',
                isAppStudio = true;
            const result = handleAppsNotInWorkspace(mockProjectPath, isAppStudio, mockVscode);
            expect(result.cwd).toBe('${workspaceFolder}');
            expect(result.launchJsonPath).toBe(
                path.join(path.dirname(mockProjectPath), path.basename(mockProjectPath))
            );
            expect(result.workspaceFolderUri).toBeUndefined();
        });
    });

    describe('handleSavedWorkspace', () => {
        it('should handle projects inside the workspace', () => {
            const mockProjectPath = '/mock/project/path';
            const mockProjectName = 'project';
            const mockTargetFolder = '/target/folder';
            (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/project');
            (getLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            const result = handleSavedWorkspace(
                mockProjectPath,
                mockProjectName,
                mockTargetFolder,
                isAppStudio,
                mockVscode
            );
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/project'
            });
        });

        // it('should create a launch config for non-workspace apps', () => {
        //     const mockProjectPath = '/mock/project/path';
        //     const mockProjectName = 'project';
        //     const mockTargetFolder = '/target/folder';
        //     (isFolderInWorkspace as jest.Mock).mockReturnValue(false);
        //     (handleAppsNotInWorkspace as jest.Mock).mockReturnValue({
        //         launchJsonPath: mockProjectPath,
        //         cwd: '${workspaceFolder}'
        //     });

        //     const result = handleSavedWorkspace(
        //         mockProjectPath,
        //         mockProjectName,
        //         mockTargetFolder,
        //         isAppStudio,
        //         mockVscode
        //     );
        //     expect(result).toEqual({
        //         launchJsonPath: mockProjectPath,
        //         cwd: '${workspaceFolder}'
        //     });
        // });
    });

    describe('handleOpenFolderButNoWorkspaceFile', () => {
        // it('should create a launch config for non-workspace apps if folder is not in workspace', () => {
        //     const mockProjectPath = '/mock/project/path';
        //     const mockTargetFolder = '/target/folder';
        //     (isFolderInWorkspace as jest.Mock).mockReturnValue(false);
        //     (handleAppsNotInWorkspace as jest.Mock).mockReturnValue({
        //         launchJsonPath: mockProjectPath,
        //         cwd: '${workspaceFolder}'
        //     });

        //     const result = handleOpenFolderButNoWorkspaceFile(
        //         mockProjectPath,
        //         mockTargetFolder,
        //         isAppStudio,
        //         mockVscode
        //     );
        //     expect(result).toEqual({
        //         launchJsonPath: mockProjectPath,
        //         cwd: '${workspaceFolder}'
        //     });
        // });

        it('should update paths for nested folders inside an open folder', () => {
            const mockProjectPath = '/mock/project/nestedFolder';
            const mockTargetFolder = '/target/folder';
            const mockWsFolder = '/mock/workspace/folder';
            const mockNestedFolder = 'nestedFolder';

            (isFolderInWorkspace as jest.Mock).mockReturnValue(true);
            mockVscode.workspace.getWorkspaceFolder.mockReturnValue({ uri: { fsPath: mockWsFolder } });
            (path.relative as jest.Mock).mockReturnValue(mockNestedFolder);
            (formatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/nestedFolder');
            (getLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            const result = handleOpenFolderButNoWorkspaceFile(
                mockProjectPath,
                mockTargetFolder,
                isAppStudio,
                mockVscode
            );
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
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

            handleAppsNotInWorkspace(mockProjectPath, isAppStudio, mockVscode)
            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}/nestedFolder', 
                workspaceFolderUri: {
                    fsPath: mockProjectPath
                }
            });
        });

        it('should handle no workspace case', () => {
            const mockProjectPath = '/mock/project/path';
            const options = {
                projectPath: mockProjectPath,
                vscode: { ...mockVscode, workspace: undefined }
            } as DebugOptions;
            handleAppsNotInWorkspace(mockProjectPath, isAppStudio, mockVscode)

            const result = handleWorkspaceConfig(options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}/nestedFolder', 
                workspaceFolderUri: {
                    fsPath: mockProjectPath
                }
            });
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
            const mockProjectPath = '/mock/project/path';
            const mockTargetFolder = '/target/folder';
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
