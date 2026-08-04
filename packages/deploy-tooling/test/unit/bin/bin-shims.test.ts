import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __testdirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__testdirname, '../../..');
const binDeploy = resolve(rootDir, 'bin/deploy');
const binUndeploy = resolve(rootDir, 'bin/undeploy');
const distCliDir = resolve(rootDir, 'dist/cli');
const distIndexPath = resolve(distCliDir, 'index.js');
const distIndexBackup = resolve(distCliDir, 'index.js.__backup');

/**
 * Replaces dist/cli/index.js with a fixture module, runs callback, then restores.
 */
async function withBrokenDist(fixtureContent: string, callback: () => void): Promise<void> {
    renameSync(distIndexPath, distIndexBackup);
    mkdirSync(distCliDir, { recursive: true });
    writeFileSync(distIndexPath, fixtureContent);
    try {
        callback();
    } finally {
        rmSync(distIndexPath);
        renameSync(distIndexBackup, distIndexPath);
    }
}

describe('bin shims', () => {
    describe('deploy', () => {
        it('exits 1 and writes error to stderr when dist/cli/index.js fails to import', async () => {
            const errorMessage = 'Simulated import failure in deploy bin';
            await withBrokenDist(`throw new Error('${errorMessage}');`, () => {
                const result = spawnSync(process.execPath, [binDeploy], { encoding: 'utf-8' });
                expect(result.status).toBe(1);
                expect(result.stderr).toContain(errorMessage);
            });
        });

        it('exits 1 and writes stringified error to stderr when dist/cli/index.js throws a non-Error', async () => {
            await withBrokenDist(`throw 'string error from deploy';`, () => {
                const result = spawnSync(process.execPath, [binDeploy], { encoding: 'utf-8' });
                expect(result.status).toBe(1);
                expect(result.stderr).toContain('string error from deploy');
            });
        });
    });

    describe('undeploy', () => {
        it('exits 1 and writes error to stderr when dist/cli/index.js fails to import', async () => {
            const errorMessage = 'Simulated import failure in undeploy bin';
            await withBrokenDist(`throw new Error('${errorMessage}');`, () => {
                const result = spawnSync(process.execPath, [binUndeploy], { encoding: 'utf-8' });
                expect(result.status).toBe(1);
                expect(result.stderr).toContain(errorMessage);
            });
        });

        it('exits 1 and writes stringified error to stderr when dist/cli/index.js throws a non-Error', async () => {
            await withBrokenDist(`throw 'string error from undeploy';`, () => {
                const result = spawnSync(process.execPath, [binUndeploy], { encoding: 'utf-8' });
                expect(result.status).toBe(1);
                expect(result.stderr).toContain('string error from undeploy');
            });
        });
    });
});
