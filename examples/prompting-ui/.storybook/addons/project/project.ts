import { join } from 'path';

// const sampleAppPath = join(__dirname, '../../../fe-fpm-cli/sample/fe-app');
export const testAppPath = join(__dirname, '../../../fe-fpm-cli/test-output/fe-app', `${Date.now()}`);
let currentAppPath = testAppPath;

export const setProjectPath = (path: string): void => {
    currentAppPath = path;
};

export const getProjectPath = (): string => {
    return currentAppPath;
};
