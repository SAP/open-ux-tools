import { join } from 'path';
import { findFiles } from '../../src/file';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('Tests for findFiles()', () => {
    const root = join(__dirname, '../test-data/file');
    test('Find files in root', async () => {
        const result = await findFiles('rootfile', root, []);
        expect(result).toEqual([root]);
    });

    test('Find files', async () => {
        const result = await findFiles('child', root, []);
        expect(result.length).toBe(2);
    });

    test('Find files with folder exclusion (stop folder)', async () => {
        const result = await findFiles('child', root, ['childB']);
        expect(result).toEqual([join(root, 'childA')]);
    });

    test('Find files with deleted folders in mem-fs', async () => {
        const fs = create(createStorage());
        fs.delete(join(root, 'childB'));
        const result = await findFiles('child', root, [], fs);
        expect(result).toEqual([join(root, 'childA')]);
    });

    test('Find files with added files in mem-fs', async () => {
        const fs = create(createStorage());
        const addedFolder = join(root, 'childC');
        fs.write(join(addedFolder, 'child'), '');
        const result = await findFiles('child', root, [], fs);
        expect(result.length).toBe(3);
        expect(result.includes(addedFolder)).toBe(true);
    });

    test('Find files with modified existing files in mem-fs', async () => {
        const fs = create(createStorage());
        fs.append(join(root, 'childB/child'), '...');
        const result = await findFiles('child', root, [], fs);
        expect(result.length).toBe(2);
    });
});
