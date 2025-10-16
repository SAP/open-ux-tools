import fs from 'fs';
import { join } from 'path';
import { TestSuite, TestCase } from 'promptfoo';
import { SNAPSHOTS_FOLDER_PATH } from '../types';

interface HookContext {
    suite?: TestSuite;
    test?: TestCase;
}

interface TestProjectData {
    type: string;
    originalPath: string;
    path: string;
}

const PROJECT_VARIABLE_NAME = 'project';

interface TestConfigSetupFiles {
    source: string;
    target: string;
}

interface TestConfig {
    [PROJECT_VARIABLE_NAME]: string;
    setupFiles?: TestConfigSetupFiles[];
}

export enum ProjectName {
    lrop = 'lrop'
}

// Currently single EDMX project, but in future it also can contain other test projects and applications
const TEST_PROJECTS: { [key: string]: TestProjectData } = {
    [ProjectName.lrop]: {
        type: 'EDMX',
        originalPath: getProjectOriginalPath(ProjectName.lrop),
        path: getProjectPath(ProjectName.lrop)
    }
};

export async function setup(hookName: string, context: HookContext) {
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
    switch (hookName) {
        // case 'beforeAll': {
        //     // Create 'PROJECT_PATH' variable with path to project/application
        //     defaultVars['PROJECT_PATH'] = project.path;
        //     break;
        // }
        case 'beforeEach': {
            // Properate copy project before running test
            copyProject(project.originalPath, project.path, config?.setupFiles);
            break;
        }
    }
}

function getProjectPath(name: ProjectName): string {
    return join(__dirname, `../projects/copy`, name);
}

function getProjectOriginalPath(name: ProjectName): string {
    return join(__dirname, `../projects/original`, name);
}

function copyProject(source: string, dest: string, setupFiles: TestConfigSetupFiles[] = []): void {
    // Copy whole project
    copyFolder(source, dest);
    // Overwrite files with passed setup files
    for (const setupFile of setupFiles) {
        const setupFilePath = join(SNAPSHOTS_FOLDER_PATH, setupFile.source);
        const targetFilePath = join(dest, setupFile.target);
        fs.copyFileSync(setupFilePath, targetFilePath);
    }
}

/**
 * Copies all contents from source directory to dest directory.
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
