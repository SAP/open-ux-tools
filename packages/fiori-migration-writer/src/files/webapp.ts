/**
 * Helper functions for creating and managing webapp folder structure
 */

import { join, basename, sep } from 'node:path';
import { stat, readdir, access } from 'node:fs/promises';
import { fileExists, updateJSON, readFile, writeFile, deleteFile } from '../utils/index.js';
import { DirName, FileName } from '../project-spec-types.js';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import { mkdir, exists, isMemFsEnabled, getCurrentEditor } from '../utils/fs-adapter.js';
import type { ImportProjectInfo } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';
import { validateRootDirectory, validateGitRelativePath } from '../utils/path-validation.js';
import { hasStore } from '../types/mem-fs-types.js';

/**
 * Helper function to check if a path exists on real filesystem (async)
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
        await mkdir(destPath);

        // Read directory contents (real fs)
        const entries = await readdir(sourcePath, { withFileTypes: true });

        // Recursively move each entry
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
        const content = await readFile(sourcePath);
        await writeFile(destPath, content);

        // Delete source file after copying
        await deleteFile(sourcePath);
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
            await updateJSON(join(rootPath, projectInfo.webappPath, FileName.Manifest), manifestJson);
        } else {
            await updateJSON(join(rootPath, FileName.Manifest), manifestJson);
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

        await mkdir(join(rootPath, DirName.Webapp));

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
            const filesInRoot: string[] = [];

            // Collect all files directly in root (not in subdirectories)
            editor.store.each((file) => {
                const filePath = file.path;
                if (filePath.startsWith(rootPathWithSep)) {
                    const relativePath = filePath.substring(rootPathWithSep.length);
                    // Only files directly in root (no path separator in relative path)
                    if (relativePath && !relativePath.includes(sep)) {
                        const fileName = basename(filePath);
                        if (direntToFilter.indexOf(fileName) === -1) {
                            filesInRoot.push(filePath);
                        }
                    }
                }
            });

            // Move files to webapp folder in mem-fs
            for (const filePath of filesInRoot) {
                const fileName = basename(filePath);
                const destPath = join(rootPath, DirName.Webapp, fileName);
                const content = readFile(filePath);
                writeFile(destPath, content);
                deleteFile(filePath);
            }
        } else {
            // Use real filesystem
            const dirContent = await readdir(rootPath, { withFileTypes: true });
            const runner = new CommandRunner();

            // Validate root directory once
            const safeRootPath = await validateRootDirectory(rootPath);

            // Move files to webapp folder
            for (const path of dirContent) {
                if (direntToFilter.indexOf(path.name) === -1) {
                    try {
                        // Validate paths before passing to git - path.name is from fs.readdir
                        const relSource = validateGitRelativePath(path.name);
                        const relDest = validateGitRelativePath(join(DirName.Webapp, path.name));

                        // use git to move files if available (validated relative paths prevent injection)
                        await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relSource, relDest]);
                    } catch (error: unknown) {
                        // Expected: git command may fail if git is not installed or repo is not initialized.
                        // Fallback to file system move (handled below) is intentional.
                    }

                    // Fallback to file system move if git didn't work
                    if (await pathExistsOnDisk(join(rootPath, path.name))) {
                        const sourcePath = join(rootPath, path.name);
                        const destPath = join(rootPath, DirName.Webapp, path.name);

                        // Recursively move files and directories
                        // Source files are automatically deleted after copy completes
                        await recursiveMove(sourcePath, destPath);
                    }
                }
            }
        }

        // Update webapp path
        projectInfo.webappPath = DirName.Webapp;
    }
}
