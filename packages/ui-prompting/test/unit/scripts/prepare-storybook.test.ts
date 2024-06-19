import fs from 'fs';
import { sep } from 'path';
import run from '../../../scripts/storybook';

describe('prepare-storybook.ts', () => {
    let mkdirSyncSpy: jest.SpyInstance;
    let existsSyncSpy: jest.SpyInstance;
    let copyFileSyncSpy: jest.SpyInstance;
    let readdirSyncSpy: jest.SpyInstance;
    beforeEach(() => {
        mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
        existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        readdirSyncSpy = jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
        copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockReturnValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const getCopiedFilePaths = (): Array<{ source: string; target: string }> => {
        return copyFileSyncSpy.mock.calls.map((call: string[]) => {
            const sourceParts = call[0].split(sep);
            const targetParts = call[1].split(sep);
            return {
                source: sourceParts[sourceParts.length - 1],
                target: targetParts[targetParts.length - 1]
            };
        });
    };

    test('Copy all missing files', async () => {
        existsSyncSpy.mockReturnValue(false);
        readdirSyncSpy.mockReturnValue(['file1.css', 'file2.css']);
        await run([]);
        // "static" folder creation
        expect(mkdirSyncSpy).toBeCalledTimes(1);
        const mkdirFolter = mkdirSyncSpy.mock.calls[0][0];
        expect(mkdirFolter.endsWith('static')).toBeTruthy();
        // copy files
        expect(copyFileSyncSpy).toBeCalledTimes(4);
        const copiedFiles = getCopiedFilePaths();
        expect(copiedFiles).toEqual([
            {
                'source': 'file1.css',
                'target': 'file1.css'
            },
            {
                'source': 'file2.css',
                'target': 'file2.css'
            },
            {
                'source': 'manager-head.html',
                'target': 'manager-head.html'
            },
            {
                'source': 'preview-head.html',
                'target': 'preview-head.html'
            }
        ]);
    });

    test('Files already exists', async () => {
        existsSyncSpy.mockReturnValue(true);
        readdirSyncSpy.mockReturnValue(['file1.css', 'file2.css']);
        await run([]);
        // "static" folder creation
        expect(mkdirSyncSpy).toBeCalledTimes(0);
        // copy files
        expect(copyFileSyncSpy).toBeCalledTimes(0);
    });

    test('Files already exists - overwrite true', async () => {
        existsSyncSpy.mockReturnValue(true);
        readdirSyncSpy.mockReturnValue(['file1.css']);
        await run(['--overwrite']);
        // "static" folder creation
        expect(mkdirSyncSpy).toBeCalledTimes(0);
        // copy files
        expect(copyFileSyncSpy).toBeCalledTimes(3);
        const copiedFiles = getCopiedFilePaths();
        expect(copiedFiles).toEqual([
            {
                'source': 'file1.css',
                'target': 'file1.css'
            },
            {
                'source': 'manager-head.html',
                'target': 'manager-head.html'
            },
            {
                'source': 'preview-head.html',
                'target': 'preview-head.html'
            }
        ]);
    });
});
