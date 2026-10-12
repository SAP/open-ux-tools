/**
 * Helper functions for creating and managing webapp folder structure
 */

import { join, sep } from 'node:path';
import { stat, readdir, access } from 'node:fs/promises';
import { fileExists, updateJSON, readFile, writeFile, deleteFile } from '../utils/index.js';
import { DirName, FileName } from '../project-spec-types.js';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { mkdir, exists, isMemFsEnabled, getCurrentEditor } from '../utils/fs-adapter.js';
import type { ImportProjectInfo } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';
import { validateRootDirectory, validateGitRelativePath } from '../utils/path-validation.js';
import { hasStore } from '../types/mem-fs-types.js';
import type { Dirent } from 'node:fs';

/**
 * Helper function to check if a path exists on real filesystem (async)
 *
 * @param path
 */
async function pathExistsOnDisk(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Move files using git and fallback to filesystem move
 *
 * @param rootPath - Project root path
 * @param dirContent - Directory entries to process
 * @param direntToFilter - Files/directories to exclude
 */
async function moveFilesWithGitFallback(
    rootPath: string,
    dirContent: Dirent[],
    direntToFilter: string[]
): Promise<void> {
    const runner = new CommandRunner();
    const safeRootPath = await validateRootDirectory(rootPath);

    // Move files sequentially to avoid git/filesystem race conditions
    for (const entry of dirContent) {
        if (!direntToFilter.includes(entry.name)) {
            try {
                // Validate paths before passing to git
                const relSource = validateGitRelativePath(entry.name);
                const relDest = validateGitRelativePath(join(DirName.Webapp, entry.name));

                // Security: Safe from command injection (see inline comment in calling function)

                await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relSource, relDest]);
            } catch {
                // Git command may fail - fallback handled below
            }

            // Fallback to file system move if git didn't work

            if (await pathExistsOnDisk(join(rootPath, entry.name))) {
                const sourcePath = join(rootPath, entry.name);
                const destPath = join(rootPath, DirName.Webapp, entry.name);

                await recursiveMove(sourcePath, destPath);
            }
        }
    }
}

/**
 * Recursively move files and directories from source to destination
 * Handles both mem-fs and real filesystem operations
 *
 * @param sourcePath - Source path
 * @param destPath - Destination path
 */
async function recursiveMove(sourcePath: string, destPath: string): Promise<void> {
    // Check if source exists (handles both mem-fs and real fs)
    if (!(await exists(sourcePath)) && !(await pathExistsOnDisk(sourcePath))) {
        return; // Nothing to move
    }

    // Check if it's a directory (real fs check - mem-fs doesn't have directories)
    let isDirectory = false;
    if (await pathExistsOnDisk(sourcePath)) {
        const stats = await stat(sourcePath);
        isDirectory = stats.isDirectory();
    }

    if (isDirectory) {
        // Ensure destination directory exists
        mkdir(destPath);

        // Read directory contents (real fs)
        const entries = await readdir(sourcePath, { withFileTypes: true });

        // Recursively move each entry sequentially to maintain filesystem consistency
        for (const entry of entries) {
            const srcEntry = join(sourcePath, entry.name);
            const destEntry = join(destPath, entry.name);

            await recursiveMove(srcEntry, destEntry);
        }

        // Delete the now-empty source directory (real fs only)
        if (!isMemFsEnabled() && (await pathExistsOnDisk(sourcePath))) {
            const { rm } = await import('node:fs/promises');
            await rm(sourcePath, { recursive: true, force: true });
        }
    } else {
        // It's a file - copy it
        const content = readFile(sourcePath);
        writeFile(destPath, content);

        // Delete source file after copying
        deleteFile(sourcePath);
    }
}

/**
 * Create basic extension project manifest.json
 * Creates a minimal manifest needed for extension project preview
 *
 * @param rootPath
 * @param projectInfo
 */
export async function createExtensionProjectManifest(rootPath: string, projectInfo: ImportProjectInfo): Promise<void> {
    // Only create if manifest doesn't exist and it's an extension project
    if (
        !(await fileExists(join(rootPath, projectInfo.webappPath, FileName.Manifest))) &&
        !(await fileExists(join(rootPath, FileName.Manifest))) &&
        projectInfo.type === MigrationTypes.projectExtension
    ) {
        // Add a basic manifest.json (not linked in component.json) needed for preview
        const manifestJson = {
            _version: '1.48.0',
            'sap.app': {
                id: projectInfo.moduleName,
                type: 'application',
                applicationVersion: {
                    version: '1.0.0'
                },
                title: '{{SHELL_TITLE}}'
            },
            'sap.ui': {
                _version: '1.1.0',
                technology: 'UI5',
                deviceTypes: {
                    desktop: true,
                    tablet: true,
                    phone: true
                },
                supportedThemes: ['sap_hcb', 'sap_bluecrystal', 'sap_fiori_3']
            },
            'sap.ui5': {
                _version: '1.1.0',
                dependencies: {
                    minUI5Version: projectInfo.manifestUI5Version ?? projectInfo.ui5Version
                },
                extends: {
                    component: projectInfo.extensionProjectSettings.namespace,
                    extensions: {}
                },
                contentDensities: {
                    compact: true,
                    cozy: true
                }
            }
        };

        // Write manifest to appropriate location
        // Check if webapp directory exists (works for both mem-fs and real fs)
        const shouldWriteToWebapp = projectInfo.webappPath && (await exists(join(rootPath, projectInfo.webappPath)));

        if (shouldWriteToWebapp) {
            updateJSON(join(rootPath, projectInfo.webappPath, FileName.Manifest), manifestJson);
        } else {
            updateJSON(join(rootPath, FileName.Manifest), manifestJson);
            projectInfo.webappPath = '';
        }
    }
}

/**
 * Create webapp folder and migrate files into it
 * For projects with manifest.json at root level, creates webapp folder and moves appropriate files
 *
 * @param rootPath
 * @param projectInfo
 */
export async function createWebappFolderAndMigrateFiles(
    rootPath: string,
    projectInfo: ImportProjectInfo
): Promise<void> {
    // Only proceed if webapp path is empty and manifest exists in root
    const manifestPath = join(rootPath, FileName.Manifest);
    const manifestExists = await fileExists(manifestPath);

    if (projectInfo.webappPath === '' && manifestExists) {
        // manifest.json is outside of webapp folder and should not be a legacy project
        // as previous block will have updated this folder structure
        // create webapp, move files into it and update current webapp path

        mkdir(join(rootPath, DirName.Webapp));

        // List of files/directories to exclude from migration
        const direntToFilter = [
            'neo-app.json',
            '.gitignore',
            '.che',
            'pom.xml',
            'package.json',
            'package-lock.json',
            '.DS_Store',
            'Readme.md',
            'README.md',
            'Gruntfile.js',
            '.project.json',
            '.user.project.json',
            '.git',
            '.eslintrc',
            '.eslintrc.ext'
        ];

        const editor = getCurrentEditor();

        if (editor && hasStore(editor)) {
            // Use mem-fs to get directory listing
            const rootPathWithSep = rootPath.endsWith(sep) ? rootPath : rootPath + sep;
            const filesToMove: string[] = [];

            // Collect all files under root, excluding those whose top-level segment is filtered
            editor.store.each((file) => {
                const filePath = file.path;
                if (filePath.startsWith(rootPathWithSep)) {
                    const relativePath = filePath.substring(rootPathWithSep.length);
                    if (relativePath) {
                        const topLevelSegment = relativePath.split(sep)[0];
                        if (!direntToFilter.includes(topLevelSegment)) {
                            filesToMove.push(filePath);
                        }
                    }
                }
            });

            // Move files to webapp folder in mem-fs, preserving their relative subpath
            for (const filePath of filesToMove) {
                const relativePath = filePath.substring(rootPathWithSep.length);
                const destPath = join(rootPath, DirName.Webapp, relativePath);
                const content = readFile(filePath);
                writeFile(destPath, content);
                deleteFile(filePath);
            }
        } else {
            // Use real filesystem - extracted to helper for reduced complexity
            const dirContent = await readdir(rootPath, { withFileTypes: true });
            await moveFilesWithGitFallback(rootPath, dirContent, direntToFilter);
        }

        // Update webapp path
        projectInfo.webappPath = DirName.Webapp;
    }
}
