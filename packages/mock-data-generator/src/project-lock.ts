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
        // The owner file is written after the lock directory, and a concurrent release removes both, so a
        // missing or half-written file means "no known owner". Any other failure is real and propagates.
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
 * Whether the lock can no longer be released by its owner: the owner process on this host has ended, or
 * the lock never got an owner record and is old.
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
 * Remove a lock directory by moving it aside first, so that a removal that stops half-way never leaves a
 * lock that looks held.
 *
 * @param lockPath lock directory
 * @param expectedToken token of the owner record the caller decided to remove; undefined for a lock without one
 */
async function removeLock(lockPath: string, expectedToken: string | undefined): Promise<void> {
    const removed = `${lockPath}-removed-${randomBytes(6).toString('hex')}`;
    try {
        await rename(lockPath, removed);
    } catch (error) {
        if (errnoCode(error) === 'ENOENT') {
            return;
        }
        throw error;
    }
    if ((await readOwner(removed))?.token !== expectedToken) {
        // Another process took the lock between the decision and the move: hand it back.
        await rename(removed, lockPath);
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
 * Take the lock that serializes project data transactions in one parent directory. The lock is a directory
 * created atomically on every platform, holding a record of its owner; a lock whose owner process on this
 * host has ended is broken, and a lock held by a live process is waited for with exponential backoff.
 *
 * @example
 * const lock = await acquireProjectLock('/app/webapp/localService');
 * try { ... } finally { await lock.release(); }
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
            await mkdir(lockPath);
            break;
        } catch (error) {
            if (errnoCode(error) !== 'EEXIST') {
                throw error;
            }
        }
        const current = await readOwner(lockPath);
        if (await isStale(lockPath, current)) {
            await removeLock(lockPath, current?.token);
            continue;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            throw heldError(lockPath, current, timeoutMs);
        }
        await sleep(Math.min(delay, remaining));
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
