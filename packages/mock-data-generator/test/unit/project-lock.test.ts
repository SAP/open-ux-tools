import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import { acquireProjectLock, PROJECT_LOCK_NAME } from '../../src/project-lock.js';

describe('project lock', () => {
    let parent: string;

    beforeEach(async () => {
        parent = await mkdtemp(join(tmpdir(), 'mockgen-lock-'));
    });

    afterEach(async () => {
        await rm(parent, { recursive: true, force: true });
    });

    const writeOwner = async (owner: Record<string, unknown>): Promise<void> => {
        await mkdir(join(parent, PROJECT_LOCK_NAME));
        await writeFile(join(parent, PROJECT_LOCK_NAME, 'owner.json'), JSON.stringify(owner));
    };

    it('lets one holder in at a time and removes the lock on release', async () => {
        // Given a held lock
        const first = await acquireProjectLock(parent);
        const order: string[] = [];

        // When a second caller asks for it
        const second = acquireProjectLock(parent).then((lock) => {
            order.push('second acquired');
            return lock;
        });
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
        order.push('first released');
        await first.release();

        // Then it gets the lock only after the first holder released it
        await (await second).release();
        expect(order).toEqual(['first released', 'second acquired']);
        expect(await readdir(parent)).toEqual([]);
    });

    it('breaks a lock whose owner process on this host has ended', async () => {
        const ended = spawnSync(process.execPath, ['-e', '']).pid;
        await writeOwner({ pid: ended, hostname: hostname(), createdAt: new Date().toISOString(), token: 'old' });

        const lock = await acquireProjectLock(parent, { timeoutMs: 1_000 });
        await lock.release();
        expect(await readdir(parent)).toEqual([]);
    });

    it('breaks a lock left without an owner record by a process that ended right after creating it', async () => {
        await mkdir(join(parent, PROJECT_LOCK_NAME));
        const old = new Date(Date.now() - 60_000);
        await utimes(join(parent, PROJECT_LOCK_NAME), old, old);

        const lock = await acquireProjectLock(parent, { timeoutMs: 1_000 });
        await lock.release();
    });

    it('times out on a live lock with the lock path, its owner and how to recover', async () => {
        await writeOwner({ pid: process.pid, hostname: hostname(), createdAt: new Date().toISOString(), token: 'x' });

        await expect(acquireProjectLock(parent, { timeoutMs: 150 })).rejects.toThrow(
            new RegExp(`process ${process.pid}.*${PROJECT_LOCK_NAME}.*delete`, 'su')
        );
    });

    it('never breaks a lock held from another host', async () => {
        await writeOwner({ pid: 1, hostname: 'another-host', createdAt: new Date().toISOString(), token: 'x' });

        await expect(acquireProjectLock(parent, { timeoutMs: 150 })).rejects.toThrow(/another-host/u);
    });
});
