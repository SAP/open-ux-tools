import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ApplicationInformation } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const testAppPath = join(__dirname, `../../../test-output/fe-app-${Date.now()}`);
let currentApp: ApplicationInformation | undefined = {
    projectPath: testAppPath
};

export const setApplication = (data?: ApplicationInformation): void => {
    currentApp = data;
};

export const getApplication = (): ApplicationInformation | undefined => {
    return currentApp;
};
