import { join } from 'path';
import { DirName } from '@sap-ux/project-access';
import { launchConfigFile } from '../../src';

const feProjects = join(__dirname, 'test-workspace', 'fe-project');
const v2lrop = join(feProjects, 'v2lrop');
const cap = join(feProjects, 'cap');
const freestyleProjects = join(__dirname, 'test-workspace', 'freestyle-project');
const invalidJson = join(__dirname, 'invalid-json');

export const TestPaths = {
    feProjects,
    feProjectsLaunchConfig: join(feProjects, DirName.VSCode, launchConfigFile),
    freestyleProjects,
    freestyleProjectsLaunchConfig: join(freestyleProjects, DirName.VSCode, launchConfigFile),
    tmpDir: join(__dirname, '.tmp'),
    workspaceRoots: [feProjects, freestyleProjects],
    v2lrop,
    cap,
    invalidJson
};
