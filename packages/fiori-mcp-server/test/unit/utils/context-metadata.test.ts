import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { persistMetadata, writeContextMetadata } from '../../../src/utils/context-adp.js';

describe('writeContextMetadata', () => {
    it('writes <appPath>/.context/<name>-metadata.xml and returns the path', () => {
        const dir = mkdtempSync(join(tmpdir(), 'ctx-'));
        try {
            const p = writeContextMetadata(dir, 'mainService', '<edmx/>');
            expect(p).toBe(join(dir, '.context', 'mainService-metadata.xml'));
            expect(readFileSync(p, 'utf-8')).toBe('<edmx/>');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('persistMetadata', () => {
    it.each([
        ['small', '<edmx:Edmx/>'],
        ['multibyte', '<edmx:Edmx>Grüße</edmx:Edmx>'],
        ['large', `<edmx:Edmx>${'x'.repeat(100_000)}</edmx:Edmx>`]
    ])('saves %s metadata to disk and returns its byte size', (_name, metadata) => {
        const dir = mkdtempSync(join(tmpdir(), 'ctx-'));
        try {
            const result = persistMetadata(dir, '/odata/main/', metadata);

            expect(result).not.toHaveProperty('metadata');
            if (!('metadataFile' in result)) {
                throw new Error('Expected a metadata file');
            }
            expect(result.metadataFile.startsWith(join(dir, '.context'))).toBe(true);
            expect(readFileSync(result.metadataFile, 'utf-8')).toBe(metadata);
            expect(result.sizeBytes).toBe(Buffer.byteLength(metadata));
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
