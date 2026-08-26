import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanExistingProjectFiles } from '../../../../../src/tools/adp-controller-extension/project/scanner.js';
import { MAX_SCANNED_FILE_SIZE } from '../../../../../src/tools/adp-controller-extension/constants.js';

describe('project/scanner', () => {
    let appPath: string;
    let changesDir: string;

    beforeEach(() => {
        appPath = mkdtempSync(join(tmpdir(), 'adp-scanner-'));
        changesDir = join(appPath, 'webapp', 'changes');
        mkdirSync(changesDir, { recursive: true });
    });

    afterEach(() => {
        rmSync(appPath, { recursive: true, force: true });
    });

    test('returns an empty array when webapp/changes does not exist', async () => {
        const empty = mkdtempSync(join(tmpdir(), 'adp-scanner-empty-'));
        try {
            expect(await scanExistingProjectFiles(empty)).toEqual([]);
        } finally {
            rmSync(empty, { recursive: true, force: true });
        }
    });

    test('collects files with scannable extensions and skips others', async () => {
        const codingDir = join(changesDir, 'coding');
        mkdirSync(codingDir, { recursive: true });
        writeFileSync(join(codingDir, 'A.js'), '// js');
        writeFileSync(join(codingDir, 'B.ts'), '// ts');
        writeFileSync(join(codingDir, 'C.xml'), '<x/>');
        writeFileSync(join(codingDir, 'D.json'), '{}');
        writeFileSync(join(codingDir, 'E.md'), 'skip me');
        writeFileSync(join(changesDir, 'foo.change'), '{}');

        const files = await scanExistingProjectFiles(appPath);
        const names = files.map((f) => f.relativePath).sort();

        expect(names).toEqual([
            join('webapp', 'changes', 'coding', 'A.js'),
            join('webapp', 'changes', 'coding', 'B.ts'),
            join('webapp', 'changes', 'coding', 'C.xml'),
            join('webapp', 'changes', 'coding', 'D.json')
        ]);
    });

    test('skips files larger than MAX_SCANNED_FILE_SIZE', async () => {
        const big = 'x'.repeat(MAX_SCANNED_FILE_SIZE + 1);
        writeFileSync(join(changesDir, 'big.js'), big);
        writeFileSync(join(changesDir, 'small.js'), 'tiny');

        const files = await scanExistingProjectFiles(appPath);
        const names = files.map((f) => f.relativePath);

        expect(names).toContain(join('webapp', 'changes', 'small.js'));
        expect(names).not.toContain(join('webapp', 'changes', 'big.js'));
    });
});
