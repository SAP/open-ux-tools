import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { DirName } from '@sap-ux/project-access';
import { LAUNCH_JSON_FILE } from '../../src/types';

const testDataDir = dirname(fileURLToPath(import.meta.url));
const feProjects = join(testDataDir, 'test-workspace', 'fe-projects');
const v4 = join(feProjects, 'fiori-elements-v4');
const v2 = join(feProjects, 'fiori-elements-v2');
const cap = join(feProjects, 'cap');
const freestyleProjects = join(testDataDir, 'test-workspace', 'freestyle-project');
const invalidJson = join(testDataDir, 'invalid-json');
const emptyJson = join(testDataDir, 'empty-json');

export const TestPaths = {
    feProjects,
    feProjectsLaunchConfig: join(feProjects, DirName.VSCode, LAUNCH_JSON_FILE),
    freestyleProjects,
    freestyleProjectsLaunchConfig: join(freestyleProjects, DirName.VSCode, LAUNCH_JSON_FILE),
    tmpDir: join(testDataDir, '.tmp'),
    workspaceRoots: [feProjects, freestyleProjects],
    v4,
    v2,
    cap,
    invalidJson,
    emptyJson
};
