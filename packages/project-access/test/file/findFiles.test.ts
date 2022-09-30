import { join } from 'path';
import { findFiles, findFileUp } from '../../src/file';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('findFiles', () => {
    const root = join(__dirname, '../test-data/file');

    describe('findFiles', () => {
        test('Find files in root', async () => {
            const result = await findFiles('rootfile', root, []);
            expect(result).toEqual([root]);
        });

        test('Find files', async () => {
            const result = await findFiles('child', root, []);
            expect(result.length).toBe(4);
        });

        test('Find files with folder exclusion (stop folder)', async () => {
            const result = await findFiles('child', root, ['childB', 'childC']);
            expect(result).toEqual([join(root, 'childA')]);
        });

        test('Find files with deleted folders in mem-fs', async () => {
            const fs = create(createStorage());
            fs.delete(join(root, 'childB'));
            fs.delete(join(root, 'childC'));
            const result = await findFiles('child', root, [], fs);
            expect(result).toEqual([join(root, 'childA')]);
        });

        test('Find files with added files in mem-fs', async () => {
            const fs = create(createStorage());
            const addedFolder = join(root, 'childD');
            fs.write(join(addedFolder, 'child'), '');
            const result = await findFiles('child', root, ['childC'], fs);
            expect(result.length).toBe(3);
            expect(result.includes(addedFolder)).toBe(true);
        });

        test('Find files with modified existing files in mem-fs', async () => {
            const fs = create(createStorage());
            fs.append(join(root, 'childB/child'), '...');
            const result = await findFiles('child', root, [], fs);
            expect(result.length).toBe(4);
        });
    });

    describe('findFileUp', () => {
        const file = 'child';
        test('file in the start folder', async () => {
            const start = join(root, 'childA');
            expect(await findFileUp(file, start)).toBe(join(start, file));
        });

        test('file in parent folder', async () => {
            const start = join(root, 'childC/nested1');
            expect(await findFileUp(file, start)).toBe(join(start, '..', file));
        });

        test('no match', async () => {
            expect(await findFileUp(file, root)).toBeUndefined();
        });

        test('file in mem-fs', async () => {
            const fs = create(createStorage());
            fs.write(join(root, file), '...');
            expect(await findFileUp(file, root, fs)).toBe(join(root, file));
        });
    });
});
