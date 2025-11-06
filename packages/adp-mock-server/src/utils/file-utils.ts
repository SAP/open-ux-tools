import fs from 'fs/promises';
import { MOCK_DATA_FOLDER_PATH } from '../constants';

export function createMockDataFolderIfNeeded(): Promise<string | undefined> {
    return fs.mkdir(MOCK_DATA_FOLDER_PATH, { recursive: true });
}
