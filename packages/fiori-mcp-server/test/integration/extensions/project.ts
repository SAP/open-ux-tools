import fs from 'fs';
import { join } from 'path';
import { TestSuite, TestCase } from 'promptfoo';

interface HookContext {
    suite?: TestSuite;
    test?: TestCase;
}

interface TestProjectData {
    type: string;
    originalPath: string;
    path: string;
}

export enum ProjectName {
    lrop = 'lrop'
}

const PROJECT_VARIABLE_NAME = 'project';

// Currently single EDMX project, but in future it also can contain other test projects and applications
const TEST_PROJECTS: { [key: string]: TestProjectData } = {
    [ProjectName.lrop]: {
        type: 'EDMX',
        originalPath: getProjectOriginalPath(ProjectName.lrop),
        path: getProjectPath(ProjectName.lrop)
    }
};

export async function setup(hookName: string, context: HookContext) {
    let defaultVars = typeof context.test === 'object' ? context.test.vars : undefined;
    if (!defaultVars) {
        defaultVars = typeof context.suite?.defaultTest === 'object' ? context.suite.defaultTest.vars : undefined;
    }
    const projectName =
        defaultVars && PROJECT_VARIABLE_NAME in defaultVars
            ? (defaultVars[PROJECT_VARIABLE_NAME] as ProjectName)
            : undefined;
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
            copyFolder(project.originalPath, project.path);
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
