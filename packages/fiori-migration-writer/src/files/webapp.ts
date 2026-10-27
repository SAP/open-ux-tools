/**
 * Helper functions for creating and managing webapp folder structure
 */

import { join } from 'node:path';
import { stat, readdir, access } from 'node:fs/promises';
import type { MemFsEditor } from 'mem-fs-editor';
import { fileExists, updateJSON, readFile, writeFile, deleteFile } from '../utils/index.js';
import { DirName, FileName } from '../project-spec-types.js';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { editorHasPath } from '../utils/fs-adapter.js';
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
 * @param fs - mem-fs editor
 * @param rootPath - Project root path
 * @param dirContent - Directory entries to process
 * @param direntToFilter - Files/directories to exclude
 */
async function moveFilesWithGitFallback(
    fs: MemFsEditor,
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

                await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relSource, relDest]); // NOSONAR: Sequential git operations required
            } catch {
                // Git command may fail - fallback handled below
            }

            // Fallback to file system move if git didn't work

            if (await pathExistsOnDisk(join(rootPath, entry.name))) {
                // NOSONAR - Sequential check after git required
                const sourcePath = join(rootPath, entry.name);
                const destPath = join(rootPath, DirName.Webapp, entry.name);

                await recursiveMove(fs, sourcePath, destPath); // NOSONAR - Filesystem race prevention
            }
        }
    }
}

/**
 * Recursively move files and directories from source to destination
 * Handles both mem-fs and real filesystem operations
 *
 * @param fs - mem-fs editor
 * @param sourcePath - Source path
 * @param destPath - Destination path
 */
async function recursiveMove(fs: MemFsEditor, sourcePath: string, destPath: string): Promise<void> {
    // Check if source exists (staged in mem-fs or on the real filesystem)
    if (!editorHasPath(fs, sourcePath) && !(await pathExistsOnDisk(sourcePath))) {
        return; // Nothing to move
    }

    // Check if it's a directory (real fs check - mem-fs doesn't have directories)
    let isDirectory = false;
    if (await pathExistsOnDisk(sourcePath)) {
        const stats = await stat(sourcePath);
        isDirectory = stats.isDirectory();
    }

    if (isDirectory) {
        // Read directory contents (real fs); mem-fs creates directories implicitly on write
        const entries = await readdir(sourcePath, { withFileTypes: true });

        // Recursively move each entry sequentially to maintain filesystem consistency
        for (const entry of entries) {
            const srcEntry = join(sourcePath, entry.name);
            const destEntry = join(destPath, entry.name);

            await recursiveMove(fs, srcEntry, destEntry); // NOSONAR: Parent-child order preservation required
        }
    } else {
        // It's a file - copy it
        const content = readFile(fs, sourcePath);
        writeFile(fs, destPath, content);

        // Delete source file after copying
        deleteFile(fs, sourcePath);
    }
}

/**
 * Create basic extension project manifest.json
 * Creates a minimal manifest needed for extension project preview
 *
 * @param fs
 * @param rootPath
 * @param projectInfo
 */
export async function createExtensionProjectManifest(
    fs: MemFsEditor,
    rootPath: string,
    projectInfo: ImportProjectInfo
): Promise<void> {
    // Only create if manifest doesn't exist and it's an extension project
    if (
        !(await fileExists(fs, join(rootPath, projectInfo.webappPath, FileName.Manifest))) &&
        !(await fileExists(fs, join(rootPath, FileName.Manifest))) &&
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
        // Check if webapp directory exists (staged in mem-fs or on disk, including an empty real dir)
        const shouldWriteToWebapp =
            projectInfo.webappPath && (await fileExists(fs, join(rootPath, projectInfo.webappPath)));

        if (shouldWriteToWebapp) {
            updateJSON(fs, join(rootPath, projectInfo.webappPath, FileName.Manifest), manifestJson);
        } else {
            updateJSON(fs, join(rootPath, FileName.Manifest), manifestJson);
            projectInfo.webappPath = '';
        }
    }
}

/**
 * Create webapp folder and migrate files into it
 * For projects with manifest.json at root level, creates webapp folder and moves appropriate files
 *
 * @param fs
 * @param rootPath
 * @param projectInfo
 */
export async function createWebappFolderAndMigrateFiles(
    fs: MemFsEditor,
    rootPath: string,
    projectInfo: ImportProjectInfo
): Promise<void> {
    // Only proceed if webapp path is empty and manifest exists in root
    const manifestPath = join(rootPath, FileName.Manifest);
    const manifestExists = await fileExists(fs, manifestPath);

    if (projectInfo.webappPath === '' && manifestExists) {
        // manifest.json is outside of webapp folder and should not be a legacy project
        // as previous block will have updated this folder structure
        // create webapp, move files into it and update current webapp path

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

        if (hasStore(fs)) {
            // Use mem-fs to get directory listing
            // mem-fs stores keys with forward slashes, so normalize separators for Windows compatibility
            const normalizedRoot = rootPath.replaceAll('\\', '/');
            const rootPathWithSep = normalizedRoot.endsWith('/') ? normalizedRoot : normalizedRoot + '/';
            const filesToMove: string[] = [];

            // Collect all files under root, excluding those whose top-level segment is filtered
            fs.store.each((file) => {
                const filePath = file.path.replaceAll('\\', '/'); // Normalize mem-fs keys
                if (filePath.startsWith(rootPathWithSep)) {
                    const relativePath = filePath.substring(rootPathWithSep.length);
                    if (relativePath) {
                        const topLevelSegment = relativePath.split('/')[0]; // Use forward slash for mem-fs paths
                        if (!direntToFilter.includes(topLevelSegment)) {
                            filesToMove.push(file.path); // Keep original path for mem-fs operations
                        }
                    }
                }
            });

            // Move files to webapp folder in mem-fs, preserving their relative subpath
            for (const filePath of filesToMove) {
                const normalizedPath = filePath.replaceAll('\\', '/');
                const relativePath = normalizedPath.substring(rootPathWithSep.length);
                const destPath = join(rootPath, DirName.Webapp, relativePath);
                const content = readFile(fs, filePath);
                writeFile(fs, destPath, content);
                deleteFile(fs, filePath);
            }
        } else {
            // Use real filesystem - extracted to helper for reduced complexity
            const dirContent = await readdir(rootPath, { withFileTypes: true });
            await moveFilesWithGitFallback(fs, rootPath, dirContent, direntToFilter);
        }

        // Update webapp path
        projectInfo.webappPath = DirName.Webapp;
    }
}
