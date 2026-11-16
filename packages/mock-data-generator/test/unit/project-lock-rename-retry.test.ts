import { jest } from '@jest/globals';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import * as actualFs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Windows refuses to rename a lock directory while another process has it open; the refusals are scripted here.
let refusals: string[] = [];
let renames = 0;

jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFs,
    rename: async (from: string, to: string): Promise<void> => {
        renames++;
        const code = refusals.shift();
        if (code) {
            throw Object.assign(new Error(`${code}: rename refused`), { code });
        }
        return actualFs.rename(from, to);
    }
}));

const { acquireProjectLock } = await import('../../src/project-lock.js');

describe('project lock release on a file system that refuses a rename', () => {
    let parent: string;

    beforeEach(async () => {
        parent = await mkdtemp(join(tmpdir(), 'mockgen-lock-retry-'));
        refusals = [];
        renames = 0;
    });

    afterEach(async () => {
        await rm(parent, { recursive: true, force: true });
    });

    it.each(['EPERM', 'EBUSY', 'EACCES'])('retries a rename refused with %s until it succeeds', async (code) => {
        // Given a held lock whose directory another process has open for two attempts
        const lock = await acquireProjectLock(parent);
        refusals = [code, code];

        // When the holder releases it
        await lock.release();

        // Then the lock is gone
        expect(renames).toBe(3);
        expect(await readdir(parent)).toEqual([]);
    });

    it('gives up after a bounded number of attempts and reports the refusal', async () => {
        // Given a held lock whose directory stays open elsewhere
        const lock = await acquireProjectLock(parent);
        refusals = new Array<string>(50).fill('EPERM');

        // When the holder releases it
        const release = lock.release();

        // Then the refusal is reported after a few attempts
        await expect(release).rejects.toMatchObject({ code: 'EPERM' });
        expect(renames).toBeGreaterThan(1);
        expect(renames).toBeLessThan(10);
    });

    it('does not retry a failure that will not pass', async () => {
        // Given a held lock and a file system that fails for another reason
        const lock = await acquireProjectLock(parent);
        refusals = ['EIO'];

        // When the holder releases it
        const release = lock.release();

        // Then the failure is reported at once
        await expect(release).rejects.toMatchObject({ code: 'EIO' });
        expect(renames).toBe(1);
    });
});
