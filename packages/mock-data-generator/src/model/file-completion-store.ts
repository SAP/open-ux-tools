import { randomBytes } from 'node:crypto';
import {
    appendFileSync,
    closeSync,
    constants,
    fstatSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { rememberLatest } from './bounded-entries.js';
import { errnoCode, errorMessage, isRecord, isSha256Hex } from '../guards.js';
import { sha256 } from '../hash.js';
import { DEFAULT_COMPLETION_STORE_ENTRIES } from '../limits.js';
import type { SftCompletionStore } from './sft-runtime.js';

/** Model answers kept on disk between processes. */
export interface FileCompletionStore extends SftCompletionStore {
    /** Why the file could not be read or written, if it could not; the store then keeps answers in memory only. */
    readonly failure: string | undefined;
}

interface OpenFileCompletionStoreOptions {
    /** Absolute directory the caller owns; created if missing. */
    directory: string;
    /** Separates model revisions: answers of one model never serve another. */
    namespace: string;
    /** Entries kept; the oldest leave first. */
    maximumEntries?: number;
    /**
     * Size the file never exceeds. Past it the file is rewritten with the newest entries that fit in half of it,
     * so rewrites stay rare.
     */
    maximumBytes?: number;
}

// A completion is one JSON object of at most eight bounded fields.
const MAXIMUM_ANSWER_LENGTH = 8_192;

/**
 * Parse one stored line into a key and answer, or undefined when it is not a well-formed entry.
 *
 * @param line one line of the store file
 * @returns the entry
 */
function parseEntry(line: string): [string, string] | undefined {
    try {
        const entry: unknown = JSON.parse(line);
        if (!isRecord(entry)) {
            return undefined;
        }
        const { k, v } = entry;
        return isSha256Hex(k) && typeof v === 'string' && v.length <= MAXIMUM_ANSWER_LENGTH ? [k, v] : undefined;
    } catch (error) {
        // A torn or corrupt line (JSON.parse's SyntaxError) is skipped; the store stays usable.
        if (error instanceof SyntaxError) {
            return undefined;
        }
        throw error;
    }
}

/**
 * Open (or create) a bounded, append-only answer store in a caller-owned directory. The file holds one
 * `{"k": <sha256 key>, "v": <completion>}` line per answer; malformed lines are skipped and a symbolic link
 * is refused. A file already larger than `maximumBytes` is reset, and an answer that would take the file past
 * `maximumBytes` rewrites it atomically with the newest entries that fit in half of that bound, so the file
 * never exceeds its bound and full rewrites stay rare. Any file error leaves a working in-memory store and
 * records `failure`.
 *
 * @param options directory, namespace and bounds
 * @returns the store
 */
export function openFileCompletionStore(options: OpenFileCompletionStoreOptions): FileCompletionStore {
    const maximumEntries = options.maximumEntries ?? DEFAULT_COMPLETION_STORE_ENTRIES;
    const maximumBytes = options.maximumBytes ?? 16 * 1024 * 1024;
    const entries = new Map<string, string>();
    let failure: string | undefined;
    let bytes = 0;
    const path = join(options.directory, `answers-${sha256(options.namespace).slice(0, 16)}.jsonl`);
    const remember = (key: string, answer: string): void => rememberLatest(entries, key, answer, maximumEntries);
    const rewrite = (): void => {
        const kept: string[] = [];
        let keptBytes = 0;
        for (const [k, v] of [...entries].reverse()) {
            const line = `${JSON.stringify({ k, v })}\n`;
            const lineBytes = Buffer.byteLength(line);
            if (keptBytes + lineBytes > Math.floor(maximumBytes / 2)) {
                break;
            }
            kept.push(line);
            keptBytes += lineBytes;
        }
        const temporary = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
        writeFileSync(temporary, kept.reverse().join(''), { mode: 0o600, flag: 'wx' });
        try {
            renameSync(temporary, path);
        } catch (error) {
            rmSync(temporary, { force: true });
            throw error;
        }
        bytes = keptBytes;
    };
    try {
        if (!isAbsolute(options.directory)) {
            throw new TypeError('the answer cache directory must be absolute');
        }
        mkdirSync(options.directory, { recursive: true, mode: 0o700 });
        let existing: ReturnType<typeof lstatSync> | undefined;
        try {
            existing = lstatSync(path);
        } catch (error) {
            // No file yet: the store starts empty. Other failures are reported as the store's failure below.
            if (errnoCode(error) !== 'ENOENT') {
                throw error;
            }
            existing = undefined;
        }
        if (existing) {
            if (!existing.isFile() || existing.isSymbolicLink()) {
                throw new TypeError('the answer cache file is not a regular file');
            }
            if (existing.size <= maximumBytes) {
                const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
                let content: string;
                try {
                    content = readFileSync(descriptor, 'utf8');
                } finally {
                    closeSync(descriptor);
                }
                for (const line of content.split('\n')) {
                    const entry = line ? parseEntry(line) : undefined;
                    if (entry) {
                        remember(entry[0], entry[1]);
                    }
                }
                bytes = existing.size;
            } else {
                rewrite();
            }
        }
    } catch (error) {
        failure = errorMessage(error);
    }
    return Object.freeze({
        get failure() {
            return failure;
        },
        get: (key: string) => entries.get(key),
        set: (key: string, answer: string) => {
            if (!isSha256Hex(key) || answer.length > MAXIMUM_ANSWER_LENGTH) {
                return;
            }
            const known = entries.get(key) === answer;
            remember(key, answer);
            if (failure !== undefined || known) {
                return;
            }
            try {
                const line = `${JSON.stringify({ k: key, v: answer })}\n`;
                if (bytes + Buffer.byteLength(line) > maximumBytes) {
                    rewrite();
                } else {
                    const descriptor = openSync(
                        path,
                        constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW,
                        0o600
                    );
                    try {
                        if (!fstatSync(descriptor).isFile()) {
                            throw new TypeError('the answer cache file is not a regular file');
                        }
                        appendFileSync(descriptor, line);
                    } finally {
                        closeSync(descriptor);
                    }
                    bytes += Buffer.byteLength(line);
                }
            } catch (error) {
                failure = errorMessage(error);
            }
        }
    });
}
