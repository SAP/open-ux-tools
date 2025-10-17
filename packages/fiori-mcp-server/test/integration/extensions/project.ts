import fs from 'fs';
import { join } from 'path';
import type { TestSuite, TestCase } from 'promptfoo';
import { FOLDER_PATHS } from '../types';

/** Variable name used to identify project configuration in test config */
const PROJECT_VARIABLE_NAME = 'project';

/**
 * Context object passed to test hooks containing suite and test information.
 */
interface HookContext {
    suite?: TestSuite;
    test?: TestCase;
}

/**
 * Configuration for setup files that need to be copied during test preparation.
 */
interface TestConfigSetupFiles {
    /** Source file path relative to snapshots folder */
    source: string;
    /** Target file path relative to project root */
    target: string;
}

/**
 * Test configuration object containing project name and optional setup files.
 */
interface TestConfig {
    /** Project name identifier */
    [PROJECT_VARIABLE_NAME]: string;
    /** Optional array of setup files to copy during test preparation */
    setupFiles?: TestConfigSetupFiles[];
}

/**
 * Enumeration of available test project names.
 */
export enum ProjectName {
    /** List Report Object Page project */
    lrop = 'lrop'
}

/**
 * Registry of available test projects with their configuration data.
 * Currently contains a single EDMX project, but can be extended with other test projects and applications.
 */
const TEST_PROJECTS = {
    [ProjectName.lrop]: {
        type: 'EDMX',
        originalPath: getProjectOriginalPath(ProjectName.lrop),
        path: getCopiedProjectPath(ProjectName.lrop)
    }
};

/**
 * Sets up test environment by configuring project paths and copying project files.
 * This function is called by test hooks to prepare the test environment.
 *
 * @param hookName Name of the test hook being executed (e.g., 'beforeEach').
 * @param context Test context containing suite and test configuration.
 * @returns Promise that resolves when setup is complete.
 */
export async function setup(hookName: string, context: HookContext): Promise<void> {
    const config =
        typeof context.test === 'object' && 'config' in context.test ? (context.test.config as TestConfig) : undefined;
    let defaultVars = typeof context.test === 'object' ? context.test.vars : undefined;
    if (!defaultVars) {
        defaultVars = typeof context.suite?.defaultTest === 'object' ? context.suite.defaultTest.vars : undefined;
    }
    const projectName =
        config && PROJECT_VARIABLE_NAME in config ? (config[PROJECT_VARIABLE_NAME] as ProjectName) : undefined;
    if (!projectName || !(projectName in TEST_PROJECTS) || !defaultVars) {
        return;
    }
    const project = TEST_PROJECTS[projectName];
    if (project) {
        defaultVars['PROJECT_PATH'] = project.path;
    }
    if (hookName === 'beforeEach') {
        // Prepare copy project before running test
        copyProject(project.originalPath, project.path, config?.setupFiles);
    }
}

/**
 * Generates the destination path for a copied test project.
 *
 * @param name Name of the project.
 * @returns Full path to the copied project directory.
 */
function getCopiedProjectPath(name: ProjectName): string {
    return join(FOLDER_PATHS.copiedProjects, name);
}

/**
 * Generates the source path for an original test project.
 *
 * @param name Name of the project.
 * @returns Full path to the original project directory.
 */
function getProjectOriginalPath(name: ProjectName): string {
    return join(FOLDER_PATHS.originalProjects, name);
}

/**
 * Copies a test project from source to destination and applies setup file overrides.
 * First copies the entire project directory, then overwrites specific files with setup files.
 *
 * @param source Source directory path of the original project.
 * @param dest Destination directory path where project will be copied.
 * @param setupFiles Array of setup files to copy over the base project files.
 */
function copyProject(source: string, dest: string, setupFiles: TestConfigSetupFiles[] = []): void {
    // Copy whole project
    copyFolder(source, dest);
    // Overwrite files with passed setup files
    for (const setupFile of setupFiles) {
        const setupFilePath = join(FOLDER_PATHS.snapshots, setupFile.source);
        const targetFilePath = join(dest, setupFile.target);
        fs.copyFileSync(setupFilePath, targetFilePath);
    }
}

/**
 * Recursively copies all files and subdirectories from a source directory to a destination directory.
 *
 * @param source The absolute or relative path to the source directory.
 * @param dest The absolute or relative path to the destination directory.
 */
function copyFolder(source: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
        const entrySource = join(source, entry.name);
        const entryDest = join(dest, entry.name);
        if (entry.isDirectory()) {
            copyFolder(entrySource, entryDest);
        } else if (entry.isFile()) {
            fs.copyFileSync(entrySource, entryDest);
        }
    }
}
