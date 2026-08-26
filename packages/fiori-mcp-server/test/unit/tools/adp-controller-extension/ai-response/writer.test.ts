import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import {
    PathTraversalError,
    resolveWithinAppPath,
    writeExtractedFile
} from '../../../../../src/tools/adp-controller-extension/ai-response/writer.js';

describe('ai-response/writer', () => {
    let appPath: string;

    beforeEach(() => {
        appPath = mkdtempSync(join(tmpdir(), 'adp-writer-'));
    });

    afterEach(() => {
        rmSync(appPath, { recursive: true, force: true });
    });

    describe('resolveWithinAppPath', () => {
        test('accepts a relative path inside the project', () => {
            expect(resolveWithinAppPath(appPath, 'webapp/changes/coding/A.js')).toBe(
                ['webapp', 'changes', 'coding', 'A.js'].join(sep)
            );
        });

        test('accepts an absolute path inside the project', () => {
            const inside = join(appPath, 'webapp', 'changes', 'coding', 'A.js');
            expect(resolveWithinAppPath(appPath, inside)).toBe(['webapp', 'changes', 'coding', 'A.js'].join(sep));
        });

        test('normalises backslashes', () => {
            expect(resolveWithinAppPath(appPath, 'webapp\\changes\\coding\\A.js')).toBe(
                ['webapp', 'changes', 'coding', 'A.js'].join(sep)
            );
        });

        test('rejects an absolute path outside the project', () => {
            expect(() => resolveWithinAppPath(appPath, '/etc/passwd')).toThrow(PathTraversalError);
        });

        test('rejects a relative path that escapes via ..', () => {
            expect(() => resolveWithinAppPath(appPath, '../../etc/passwd')).toThrow(PathTraversalError);
        });

        test('rejects a sibling directory sharing the same prefix', () => {
            const sibling = `${appPath}-sibling/file.js`;
            expect(() => resolveWithinAppPath(appPath, sibling)).toThrow(PathTraversalError);
        });
    });

    describe('writeExtractedFile', () => {
        test('writes a file and creates parent directories', async () => {
            const written = await writeExtractedFile(appPath, {
                path: 'webapp/changes/coding/MyExt.js',
                code: '// hello'
            });

            expect(written).toBe(['webapp', 'changes', 'coding', 'MyExt.js'].join(sep));
            const writtenPath = join(appPath, 'webapp', 'changes', 'coding', 'MyExt.js');
            expect(existsSync(writtenPath)).toBe(true);
            expect(readFileSync(writtenPath, 'utf-8')).toBe('// hello');
        });

        test('rejects a write that escapes the project root', async () => {
            await expect(
                writeExtractedFile(appPath, { path: '../../escaped.js', code: '// nope' })
            ).rejects.toBeInstanceOf(PathTraversalError);
        });
    });
});
