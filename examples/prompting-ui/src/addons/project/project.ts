import { join } from 'path';

export const testAppPath = join(__dirname, `../../../test-output/fe-app-${Date.now()}`);
let currentAppPath = testAppPath;

export const setProjectPath = (path: string): void => {
    currentAppPath = path;
};

export const getProjectPath = (): string => {
    return currentAppPath;
};
