import { join } from 'path';
import { findFiles, findFileUp } from '../../src/file';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('file', () => {
    const root = join(__dirname, '../test-data/file');
    describe('findFiles', () => {
        test('Find files in root', async () => {
            const result = findFiles('rootfile', root, []);
            expect(result).toEqual([root]);
        });

        test('Find files', async () => {
            const result = findFiles('child', root, []);
            expect(result.length).toBe(4);
        });

        test('Find files with folder exclusion (stop folder)', async () => {
            const result = findFiles('child', root, ['childB', 'childC']);
            expect(result).toEqual([join(root, 'childA')]);
        });

        test('Find files with deleted folders in mem-fs', async () => {
            const fs = create(createStorage());
            fs.delete(join(root, 'childB'));
            fs.delete(join(root, 'childC'));
            const result = findFiles('child', root, [], fs);
            expect(result).toEqual([join(root, 'childA')]);
        });

        test('Find files with added files in mem-fs', async () => {
            const fs = create(createStorage());
            const addedFolder = join(root, 'childD');
            fs.write(join(addedFolder, 'child'), '');
            const result = findFiles('child', root, ['childC'], fs);
            expect(result.length).toBe(3);
            expect(result.includes(addedFolder)).toBe(true);
        });

        test('Find files with modified existing files in mem-fs', async () => {
            const fs = create(createStorage());
            fs.append(join(root, 'childB/child'), '...');
            const result = findFiles('child', root, [], fs);
            expect(result.length).toBe(4);
        });
    });
    describe('findFileUp', () => {
        const file = 'child';
        test('file in the start folder', () => {
            const start = join(root, 'childA');
            expect(findFileUp(file, start)).toBe(join(start, file));
        });

        test('file in parent folder', () => {
            const start = join(root, 'childC/nested1');
            expect(findFileUp(file, start)).toBe(join(start, '..', file));
        });

        test('no match', () => {
            expect(findFileUp(file, root)).toBeUndefined();
        });
    });
});
