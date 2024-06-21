import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../../src/types';

const feProjects = join(__dirname, 'test-workspace', 'fe-project');
const v2lrop = join(feProjects, 'v2lrop');
const cap = join(feProjects, 'cap');
const freestyleProjects = join(__dirname, 'test-workspace', 'freestyle-project');
const invalidJson = join(__dirname, 'invalid-json');

export const TestPaths = {
    feProjects,
    feProjectsLaunchConfig: join(feProjects, DirName.VSCode, LAUNCH_JSON_FILE),
    freestyleProjects,
    freestyleProjectsLaunchConfig: join(freestyleProjects, DirName.VSCode, LAUNCH_JSON_FILE),
    tmpDir: join(__dirname, '.tmp'),
    workspaceRoots: [feProjects, freestyleProjects],
    v2lrop,
    cap,
    invalidJson
};
