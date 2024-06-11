import { join } from 'path';

export const testAppPath = join(__dirname, '../../../fe-fpm-cli/test-output/fe-app', `${Date.now()}`);
let currentAppPath = testAppPath;

export const setProjectPath = (path: string): void => {
    currentAppPath = path;
};

export const getProjectPath = (): string => {
    return currentAppPath;
};
