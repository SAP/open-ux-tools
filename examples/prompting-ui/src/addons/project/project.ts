import { join } from 'path';
import type { ApplicationInformation } from './types';

export const testAppPath = join(__dirname, `../../../test-output/fe-app-${Date.now()}`);
let currentApp: ApplicationInformation = {
    projectPath: testAppPath
};

export const setApplication = (data: ApplicationInformation): void => {
    currentApp = data;
};

export const getApplication = (): ApplicationInformation => {
    return currentApp;
};
