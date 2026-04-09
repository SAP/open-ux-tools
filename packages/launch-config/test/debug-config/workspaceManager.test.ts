import { jest } from '@jest/globals';
import type { DebugOptions } from '../../src/types';
import path from 'node:path';

const mockFormatCwd = jest.fn<any>();
const mockGetLaunchJsonPath = jest.fn<any>();
const mockIsFolderInWorkspace = jest.fn<any>();
const mockHandleAppsNotInWorkspace = jest.fn<any>();

// Mock the helpers
jest.unstable_mockModule('../../src/debug-config/helpers', () => ({
    formatCwd: mockFormatCwd,
    handleAppsNotInWorkspace: mockHandleAppsNotInWorkspace,
    getLaunchJsonPath: mockGetLaunchJsonPath,
    isFolderInWorkspace: mockIsFolderInWorkspace
}));

const { handleWorkspaceConfig } = await import('../../src/debug-config/workspaceManager');

describe('launchConfig Unit Tests', () => {
    const isAppStudio = false;
    const mockVscode: any = {
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
            const mockProjectPath = path.join('/mock/project/path');
            (mockIsFolderInWorkspace as jest.Mock).mockReturnValue(false);
            (mockHandleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const options = {
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;

            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
        });

        it('should update paths for nested folders inside an open folder', () => {
            const mockTargetFolder = path.join('/target/folder');
            const mockNestedFolder = 'nestedFolder';
            // Set projectPath so that path.relative(wsFolder, projectPath) returns mockNestedFolder
            const mockProjectPath = path.join(mockTargetFolder, mockNestedFolder);

            (mockIsFolderInWorkspace as jest.Mock).mockReturnValue(true);
            mockVscode.workspace.getWorkspaceFolder = jest.fn().mockReturnValue({ uri: { fsPath: mockTargetFolder } });
            (mockFormatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/nestedFolder');
            (mockGetLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            const options = {
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;

            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/nestedFolder'
            });
        });
    });

    describe('handleSavedWorkspace', () => {
        it('should handle projects inside the workspace', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const mockTargetFolder = path.join('/target/folder');
            (mockIsFolderInWorkspace as jest.Mock).mockReturnValue(true);
            (mockFormatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/project');
            (mockGetLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            const options = {
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;
            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/project'
            });
        });

        it('should create a launch config for non-workspace apps', () => {
            const mockProjectPath = path.join('/mock/project/path');
            (mockIsFolderInWorkspace as jest.Mock).mockReturnValue(false);
            (mockHandleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const options = {
                isAppStudio,
                vscode: mockVscode
            } as DebugOptions;
            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
        });
    });

    describe('handleUnsavedWorkspace', () => {
        it('should update paths for nested folders inside a workspace', () => {
            const mockWsFolder = path.join('mock/workspace/folder');
            const mockNestedFolder = 'nestedFolder';
            const mockProjectPath = path.join(mockWsFolder, mockNestedFolder);
            mockVscode.workspace.getWorkspaceFolder = jest.fn().mockReturnValue({ uri: { fsPath: mockWsFolder } });
            mockVscode.workspace.workspaceFile.scheme = 'folder';
            (mockFormatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/nestedFolder');
            const options = {
                vscode: mockVscode
            } as DebugOptions;
            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockWsFolder,
                cwd: '${workspaceFolder}/nestedFolder'
            });
        });
    });

    describe('handleWorkspaceConfig', () => {
        it('should handle writeToAppOnly option', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const options = {
                writeToAppOnly: true,
                vscode: mockVscode
            } as DebugOptions;

            (mockHandleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
            expect(mockHandleAppsNotInWorkspace).toHaveBeenCalledWith(mockProjectPath, isAppStudio, mockVscode);
        });

        it('should handle open folder but no workspace file case', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const mockTargetFolder = path.join('/target/folder');
            const options = {
                vscode: {
                    ...mockVscode,
                    workspace: { ...mockVscode.workspace, workspaceFile: undefined }
                }
            } as DebugOptions;

            // Set up mocks for helpers
            (mockIsFolderInWorkspace as jest.Mock).mockReturnValue(true);
            (mockFormatCwd as jest.Mock).mockReturnValue('${workspaceFolder}/path');
            (mockGetLaunchJsonPath as jest.Mock).mockReturnValue(mockTargetFolder);

            // Call the function under test
            const result = handleWorkspaceConfig(mockProjectPath, options);

            // Assertions
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/path'
            });

            // Verify if handleOpenFolderButNoWorkspaceFile was called correctly indirectly
            const expectedLaunchJsonPath = mockGetLaunchJsonPath(mockVscode.workspace.workspaceFolders) ?? mockTargetFolder;
            const expectedCwd = mockFormatCwd(path.relative(mockTargetFolder, mockProjectPath));

            expect(result.launchJsonPath).toBe(expectedLaunchJsonPath);
            expect(result.cwd).toBe(expectedCwd);
        });

        it('should handle no workspace case', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const options = {
                vscode: { ...mockVscode, workspace: undefined }
            } as DebugOptions;
            (mockHandleAppsNotInWorkspace as jest.Mock).mockReturnValue({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });

            const result = handleWorkspaceConfig(mockProjectPath, options);
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}'
            });
            expect(mockHandleAppsNotInWorkspace).toHaveBeenCalledWith(mockProjectPath, isAppStudio, options.vscode);
        });

        it('should handle saved workspace case', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const mockTargetFolder = path.join('/target/folder');
            const localMockVscode = {
                workspace: {
                    getWorkspaceFolder: jest.fn().mockReturnValue({ uri: { fsPath: mockTargetFolder } }),
                    workspaceFile: { scheme: 'file' }
                }
            };
            // Prepare options for the test
            const options = {
                vscode: localMockVscode
            } as DebugOptions;
            // Call the function under test
            const result = handleWorkspaceConfig(mockProjectPath, options);
            // Assertions
            expect(result).toEqual({
                launchJsonPath: mockTargetFolder,
                cwd: '${workspaceFolder}/path'
            });
        });

        it('should handle unsaved workspace case', () => {
            const mockProjectPath = path.join('/mock/project/path');
            const mockTargetFolder = path.join('/target/folder');
            const localMockVscode = {
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
                vscode: localMockVscode
            } as DebugOptions;
            // Call the function under test
            const result = handleWorkspaceConfig(mockProjectPath, options);
            // Assertions
            expect(result).toEqual({
                launchJsonPath: mockProjectPath,
                cwd: '${workspaceFolder}/path'
            });
        });
    });
});
