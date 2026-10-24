import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeContextMetadata } from '../../../src/utils/context-metadata';

describe('writeContextMetadata', () => {
    it('writes <appPath>/webapp/.context/<name>-metadata.xml and returns the path', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ctx-'));
        try {
            const p = writeContextMetadata(dir, 'mainService', '<edmx/>');
            expect(p).toBe(join(dir, 'webapp', '.context', 'mainService-metadata.xml'));
            expect(readFileSync(p, 'utf-8')).toBe('<edmx/>');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
