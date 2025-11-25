import { join } from 'path';

export const FOLDER_PATHS = {
    snapshots: join(__dirname, '../snapshots'),
    originalProjects: join(__dirname, `../../test-data/original`),
    copiedProjects: join(__dirname, `../../test-data/copy`),
    tempFolder: join(__dirname, `../../test-data/temp`)
};
