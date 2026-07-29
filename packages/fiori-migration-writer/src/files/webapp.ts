/**
 * Helper functions for creating and managing webapp folder structure
 */

import { join, resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { fileExists, updateJSON } from '../utils/index.js';
import { DirName, FileName } from '../project-spec-types.js';
import { CommandRunner } from '@sap-ux/nodejs-utils';
import fsextra from 'fs-extra';
import type { ImportProjectInfo } from '../types.js';
import { MigrationTypes } from '../utils/constants.js';

/**
 * Validates the root directory path before using as working directory
 * Rejects paths with control characters that could enable command injection
 *
 * @param path - Root directory path to validate
 * @returns Validated absolute path
 * @throws Error if path contains unsafe characters or is not a directory
 */
function validateRootDirectory(path: string): string {
    const resolved = resolve(path);
    // Reject control characters and shell metacharacters
    if (/[\0\r\n`$|&;<>]/.test(resolved)) {
        throw new Error('Path contains unsafe characters');
    }
    // Ensure it's an existing directory
    if (!existsSync(resolved)) {
        throw new Error('Root directory does not exist');
    }
    return resolved;
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
        if (existsSync(join(rootPath, projectInfo.webappPath))) {
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
    if (projectInfo.webappPath === '' && (await fileExists(join(rootPath, FileName.Manifest)))) {
        // manifest.json is outside of webapp folder and should not be a legacy project
        // as previous block will have updated this folder structure
        // create webapp, move files into it and update current webapp path
        const dirContent = readdirSync(rootPath, { withFileTypes: true });
        fsextra.mkdirSync(join(rootPath, DirName.Webapp));

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

        const runner = new CommandRunner();

        // Validate root directory once
        const safeRootPath = validateRootDirectory(rootPath);

        // Move files to webapp folder
        for (const path of dirContent) {
            if (direntToFilter.indexOf(path.name) === -1) {
                try {
                    // Use relative paths - path.name is from fs.readdirSync, not user input
                    const relSource = path.name;
                    const relDest = join(DirName.Webapp, path.name);

                    // use git to move files if available (relative paths prevent injection)
                    await runner.run('git', ['-C', safeRootPath, 'mv', '-k', '--', relSource, relDest]);
                } catch {
                    // Expected: git command may fail if git is not installed or repo is not initialized.
                    // Fallback to file system move (handled below) is intentional.
                }

                // Fallback to file system move if git didn't work
                if (existsSync(join(rootPath, path.name))) {
                    fsextra.moveSync(join(rootPath, path.name), join(rootPath, DirName.Webapp, path.name));
                }
            }
        }

        // Update webapp path
        projectInfo.webappPath = DirName.Webapp;
    }
}
