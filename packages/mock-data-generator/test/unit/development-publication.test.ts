import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

describe('development publication gate', () => {
    it('stages a development publication once both packaged heads are qualified', async () => {
        const output = await mkdtemp(join(tmpdir(), 'mockgen-publication-gate-'));
        try {
            const script = resolve('scripts/stage-development-publication.mjs');
            const result = spawnSync(process.execPath, [script, '--version', '0.1.0-dev.9999', '--out', output], {
                cwd: resolve('.'),
                encoding: 'utf8',
                timeout: 30000
            });
            expect(result.status).toBe(0);
            const staged = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '{}');
            expect(staged.packedIdentity).toBe('@unseen/mock-data-generator');
            expect(staged.version).toBe('0.1.0-dev.9999');
            expect(staged.publishable).toBe(false);
            expect(staged.integrity).toMatch(/^sha512-/u);
            expect(await readdir(output)).toEqual(['unseen-mock-data-generator-0.1.0-dev.9999.tgz']);
        } finally {
            await rm(output, { recursive: true, force: true });
        }
    }, 30000);
});
