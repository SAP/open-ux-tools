import { getLaunchJsonPath, formatCwd, isFolderInWorkspace } from '../../src/debug-config/helpers';
import path from 'path';

// Mock the vscode object
const mockVscode = {
    Uri: {
        file: jest.fn((f: string) => ({ path: f }))
    }
};

describe('launchConfig Unit Tests', () => {
    const isAppStudio = false;

    // Test for to get path where launch json is going to be written
    describe('getLaunchJsonPath', () => {
        it('should return the path to launch.json in the first opened folder', () => {
            const mockWorkspaceFolders = [{ uri: { fsPath: '/mock/workspace/folder1' } }];
            const result = getLaunchJsonPath(mockWorkspaceFolders);
            expect(result).toBe('/mock/workspace/folder1');
        });

        it('should return undefined when there are no workspace folders', () => {
            const result = getLaunchJsonPath([]);
            expect(result).toBeUndefined();
        });

        it('should return undefined when workspaceFolders is undefined', () => {
            const result = getLaunchJsonPath(undefined);
            expect(result).toBeUndefined();
        });
    });

    // Test for cwd command
    describe('formatCwd', () => {
        it('should return "${workspaceFolder}" when no path is provided', () => {
            const result = formatCwd();
            expect(result).toBe('${workspaceFolder}');
        });

        it('should return "${workspaceFolder}/myProject" when "myProject" is provided', () => {
            const result = formatCwd('myProject');
            expect(result).toBe('${workspaceFolder}/myProject');
        });

        it('should return "${workspaceFolder}/nested/path" when "nested/path" is provided', () => {
            const result = formatCwd('nested/path');
            expect(result).toBe('${workspaceFolder}/nested/path');
        });
    });

    // Test for is folder in workspace
    describe('isFolderInWorkspace', () => {
        it('should return true if the selected folder is part of the workspace', () => {
            const mockWorkspace = {
                workspaceFolders: [
                    { uri: { fsPath: '/mock/workspace/folder1' } },
                    { uri: { fsPath: '/mock/workspace/folder2' } }
                ]
            };
            const result = isFolderInWorkspace('/mock/workspace/folder1/subfolder', mockWorkspace);
            expect(result).toBe(true);
        });

        it('should return false if the selected folder is not part of the workspace', () => {
            const mockWorkspace = {
                workspaceFolders: [
                    { uri: { fsPath: '/mock/workspace/folder1' } },
                    { uri: { fsPath: '/mock/workspace/folder2' } }
                ]
            };
            const result = isFolderInWorkspace('/another/folder', mockWorkspace);
            expect(result).toBe(false);
        });

        it('should return undefined if workspace is not defined or accessible', () => {
            const result = isFolderInWorkspace('/mock/workspace/folder1', {});
            expect(result).toBeUndefined();
        });

        it('should return false if workspaceFile is defined but no workspaceFolders', () => {
            const mockWorkspace = {
                workspaceFile: { scheme: 'file' },
                workspaceFolders: undefined
            };
            const result = isFolderInWorkspace('/mock/workspace/folder1', mockWorkspace);
            expect(result).toBe(false);
        });
    });
});
