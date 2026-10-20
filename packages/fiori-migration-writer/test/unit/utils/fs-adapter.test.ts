import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createMemFsEditor, loadProjectIntoEditor, editorHasPath } from '../../../src/utils/fs-adapter.js';

describe('loadProjectIntoEditor', () => {
    const testRoot = join(tmpdir(), 'load-project-test-' + Date.now());

    beforeEach(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterEach(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    test('makes pre-existing disk files visible to editorHasPath', async () => {
        const existingFile = join(testRoot, 'webapp', 'mockserver.js');
        mkdirSync(join(testRoot, 'webapp'), { recursive: true });
        writeFileSync(existingFile, 'module.exports = {};');

        const editor = createMemFsEditor();
        // Before loading, the empty store does not know about the file
        expect(editorHasPath(editor, existingFile)).toBe(false);

        await loadProjectIntoEditor(editor, testRoot);

        expect(editorHasPath(editor, existingFile)).toBe(true);
    });

    test('does not rewrite loaded-but-untouched files on commit', async () => {
        const untouched = join(testRoot, 'keep.txt');
        writeFileSync(untouched, 'original');

        const editor = createMemFsEditor();
        await loadProjectIntoEditor(editor, testRoot);

        // Overwrite on disk after loading; commit must NOT restore the loaded copy
        writeFileSync(untouched, 'changed-on-disk');
        await new Promise<void>((resolve, reject) => editor.commit((err) => (err ? reject(err) : resolve())));

        expect(readFileSync(untouched, 'utf-8')).toBe('changed-on-disk');
    });

    test('ignores node_modules, dist and .git', async () => {
        for (const dir of ['node_modules', 'dist', '.git']) {
            mkdirSync(join(testRoot, dir), { recursive: true });
            writeFileSync(join(testRoot, dir, 'ignored.txt'), 'x');
        }
        const kept = join(testRoot, 'src.txt');
        writeFileSync(kept, 'keep');

        const editor = createMemFsEditor();
        await loadProjectIntoEditor(editor, testRoot);

        expect(editorHasPath(editor, kept)).toBe(true);
        expect(editorHasPath(editor, join(testRoot, 'node_modules', 'ignored.txt'))).toBe(false);
        expect(editorHasPath(editor, join(testRoot, 'dist', 'ignored.txt'))).toBe(false);
        expect(editorHasPath(editor, join(testRoot, '.git', 'ignored.txt'))).toBe(false);
    });
});
