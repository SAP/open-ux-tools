import { join } from 'node:path';

export const FOLDER_PATHS = {
    snapshots: join(__dirname, '../snapshots'),
    originalProjects: join(__dirname, `../../test-data/original`),
    copiedProjects: join(__dirname, `../../test-data/copy`)
};
