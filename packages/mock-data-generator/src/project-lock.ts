import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { errnoCode, errorMessage, isRecord } from './guards.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { t } from './i18n.js';

/** Name of the lock directory created in the parent of a project data directory. */
export const PROJECT_LOCK_NAME = '.mockgen-project.lock';

const OWNER_FILE = 'owner.json';
const FIRST_RETRY_MS = 50;
const LONGEST_RETRY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 30_000;
// The owner record is written right after the lock directory; a lock without one for this long was
// left by a process that ended in between.
const ORPHANED_LOCK_AGE_MS = 10_000;
// Windows refuses to rename a directory while another process has it or a file in it open, as a caller
// waiting for the lock briefly does when it reads the owner record.
export const RENAME_REFUSED_CODES: ReadonlySet<string> = new Set(['EPERM', 'EACCES', 'EBUSY']);
const FIRST_RENAME_RETRY_MS = 10;
const LONGEST_RENAME_RETRY_MS = 320;

interface ProjectLockOptions {
    /** How long to wait for a lock held by a live process before giving up; 30 seconds by default. */
    timeoutMs?: number;
}

/** A held project lock. */
interface ProjectLock {
    /** Release the lock; releasing twice is harmless. */
    release(): Promise<void>;
}

interface LockOwner {
    pid: number;
    hostname: string;
    createdAt: string;
    token: string;
}

/**
 * Whether a parsed owner record has the expected shape.
 *
 * @param value parsed owner record
 * @returns whether it is a lock owner
 */
function isLockOwner(value: unknown): value is LockOwner {
    if (!isRecord(value)) {
        return false;
    }
    const owner = value;
    return (
        typeof owner.pid === 'number' &&
        Number.isSafeInteger(owner.pid) &&
        typeof owner.hostname === 'string' &&
        typeof owner.createdAt === 'string' &&
        typeof owner.token === 'string'
    );
}

/**
 * Read the owner record of a lock, or undefined when it is missing or unreadable.
 *
 * @param lockPath lock directory
 * @returns the owner
 */
async function readOwner(lockPath: string): Promise<LockOwner | undefined> {
    try {
        const value: unknown = JSON.parse(await readFile(join(lockPath, OWNER_FILE), 'utf8'));
        return isLockOwner(value) ? value : undefined;
    } catch (error) {
        // Written after the lock directory and removed by a concurrent release: missing or half-written
        // means "no known owner".
        if (errnoCode(error) === 'ENOENT' || error instanceof SyntaxError) {
            return undefined;
        }
        throw error;
    }
}

/**
 * Whether a process on this host has ended.
 *
 * @param pid process id
 * @returns whether no such process exists
 */
function processEnded(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return false;
    } catch (error) {
        // EPERM: the process exists but belongs to another user.
        return errnoCode(error) === 'ESRCH';
    }
}

/**
 * Whether the lock is stale: its owner process on this host has ended, or it has no owner record and is old.
 *
 * @param lockPath lock directory
 * @param owner the owner record, when readable
 * @returns whether the lock is stale
 */
async function isStale(lockPath: string, owner: LockOwner | undefined): Promise<boolean> {
    if (owner) {
        return owner.hostname === hostname() && processEnded(owner.pid);
    }
    try {
        return Date.now() - (await stat(lockPath)).mtimeMs > ORPHANED_LOCK_AGE_MS;
    } catch (error) {
        // A lock released meanwhile is not stale; the caller retries acquiring it.
        if (errnoCode(error) === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

/**
 * Rename a lock directory, retrying with exponential backoff while the file system refuses for a reason
 * that passes.
 *
 * @param from current path
 * @param to new path
 */
async function renameLock(from: string, to: string): Promise<void> {
    for (let delay = FIRST_RENAME_RETRY_MS; ; delay *= 2) {
        try {
            await rename(from, to); // NOSONAR: sequential, retry with backoff
            return;
        } catch (error) {
            if (delay > LONGEST_RENAME_RETRY_MS || !RENAME_REFUSED_CODES.has(errnoCode(error) ?? '')) {
                throw error;
            }
        }
        await sleep(delay); // NOSONAR: sequential, retry with backoff
    }
}

/**
 * Remove a lock directory by moving it aside first, so that a removal that stops half-way never leaves a
 * lock that looks held.
 *
 * @param lockPath lock directory
 * @param expectedToken token of the owner record the caller decided to remove; undefined for a lock without one
 */
async function removeLock(lockPath: string, expectedToken: string | undefined): Promise<void> {
    const removed = `${lockPath}-removed-${randomBytes(6).toString('hex')}`;
    try {
        await renameLock(lockPath, removed);
    } catch (error) {
        if (errnoCode(error) === 'ENOENT') {
            return;
        }
        throw error;
    }
    if ((await readOwner(removed))?.token !== expectedToken) {
        // Another process took the lock between the decision and the move: hand it back.
        await renameLock(removed, lockPath);
        return;
    }
    await rm(removed, { recursive: true, force: true });
}

/**
 * The error for a lock that stayed held by a live process.
 *
 * @param lockPath lock directory
 * @param owner the owner record, when readable
 * @param timeoutMs how long the caller waited
 * @returns the error, with code `PROJECT_LOCKED`
 */
function heldError(lockPath: string, owner: LockOwner | undefined, timeoutMs: number): MockGenError {
    const holder = owner
        ? t('lock.holderProcess', { pid: owner.pid, hostname: owner.hostname, createdAt: owner.createdAt })
        : t('lock.holderUnknown');
    return new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_LOCKED, t('lock.held', { holder, lockPath, timeoutMs }));
}

/**
 * Wait for a number of milliseconds.
 *
 * @param milliseconds how long to wait
 * @returns when the time has passed
 */
function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Take the lock that serializes project data transactions in one parent directory: an atomically created
 * directory with an owner record. A stale lock is broken; a live one is waited for with exponential backoff.
 *
 * @param parent existing directory that holds the project data directories
 * @param options how long to wait
 * @returns the held lock
 */
export async function acquireProjectLock(parent: string, options: ProjectLockOptions = {}): Promise<ProjectLock> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const lockPath = join(parent, PROJECT_LOCK_NAME);
    const deadline = Date.now() + timeoutMs;
    const owner: LockOwner = {
        pid: process.pid,
        hostname: hostname(),
        createdAt: new Date().toISOString(),
        token: randomUUID()
    };
    let delay = FIRST_RETRY_MS;
    for (;;) {
        try {
            await mkdir(lockPath); // NOSONAR: sequential, lock retry with backoff
            break;
        } catch (error) {
            if (errnoCode(error) !== 'EEXIST') {
                throw error;
            }
        }
        const current = await readOwner(lockPath); // NOSONAR: sequential, lock retry with backoff
        const stale = await isStale(lockPath, current); // NOSONAR: sequential, lock retry with backoff
        if (stale) {
            await removeLock(lockPath, current?.token); // NOSONAR: sequential, lock retry with backoff
            continue;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            throw heldError(lockPath, current, timeoutMs);
        }
        await sleep(Math.min(delay, remaining)); // NOSONAR: sequential, lock retry with backoff
        delay = Math.min(delay * 2, LONGEST_RETRY_MS);
    }
    try {
        await writeFile(join(lockPath, OWNER_FILE), JSON.stringify(owner), { flag: 'wx' });
    } catch (error) {
        await rm(lockPath, { recursive: true, force: true });
        throw error;
    }
    let released = false;
    return Object.freeze({
        release: async (): Promise<void> => {
            if (released) {
                return;
            }
            released = true;
            await removeLock(lockPath, owner.token);
        }
    });
}

/**
 * Run an action while holding the project lock of a parent directory, and release the lock afterwards.
 *
 * @param parent existing directory that holds the project data directories
 * @param action the work to serialize
 * @param options how long to wait for the lock
 * @returns the action's result
 */
export async function withProjectLock<T>(
    parent: string,
    action: () => Promise<T>,
    options: ProjectLockOptions = {}
): Promise<T> {
    const lock = await acquireProjectLock(parent, options);
    let result: T;
    try {
        result = await action();
    } catch (error) {
        try {
            await lock.release();
        } catch (releaseError) {
            throw new AggregateError([error, releaseError], t('lock.releaseFailed', { reason: errorMessage(error) }));
        }
        throw error;
    }
    await lock.release();
    return result;
}
