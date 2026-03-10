import { getDataDir } from '../src/utils';
import path from 'path';
import os from 'os';

describe('utils', () => {
    it('should return data directory path', () => {
        const dataDir = getDataDir();
        expect(dataDir).toBeDefined();
        expect(typeof dataDir).toBe('string');
        expect(dataDir.length).toBeGreaterThan(0);
    });

    it('should return platform-appropriate data directory', () => {
        const dataDir = getDataDir();
        const platform = os.platform();
        const homeDir = os.homedir();

        if (platform === 'win32') {
            // On Windows, should use LOCALAPPDATA, APPDATA, or fallback
            const expected =
                process.env.LOCALAPPDATA ||
                process.env.APPDATA ||
                path.join(homeDir, 'AppData', 'Local', 'semantic-search');
            expect(dataDir).toBe(path.join(expected, 'semantic-search'));
        } else {
            // On Unix-like systems (Linux, macOS), should use XDG_DATA_HOME or ~/.local/share
            if (process.env.XDG_DATA_HOME) {
                expect(dataDir).toBe(path.join(process.env.XDG_DATA_HOME, 'semantic-search'));
            } else {
                expect(dataDir).toBe(path.join(homeDir, '.local', 'share', 'semantic-search'));
            }
        }
    });

    it('should return consistent path on multiple calls', () => {
        const dataDir1 = getDataDir();
        const dataDir2 = getDataDir();
        expect(dataDir1).toBe(dataDir2);
    });
});
