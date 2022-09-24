import { join } from 'path';
import { findFiles } from '../../src/file';

describe('Tests for findFiles()', () => {
    test('Find files in root', async () => {
        const root = join(__dirname, '..', 'test-data', 'file');
        const result = await findFiles('rootfile', root, []);
        expect(result).toEqual([root]);
    });

    test('Find files', async () => {
        const root = join(__dirname, '..', 'test-data', 'file');
        const result = await findFiles('child', root, []);
        expect(result.length).toBe(2);
    });

    test('Find files with folder exclusion (stop folder)', async () => {
        const root = join(__dirname, '..', 'test-data', 'file');
        const result = await findFiles('child', root, ['childB']);
        expect(result).toEqual([join(root, 'childA')]);
    });
});
