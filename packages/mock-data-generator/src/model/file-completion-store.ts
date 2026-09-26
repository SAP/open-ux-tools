import { createHash } from 'node:crypto';
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
    writeFileSync
} from 'node:fs';
import { isAbsolute, join } from 'node:path';
import type { SftCompletionStore } from './sft-runtime.js';

/** Model answers kept on disk between processes, such as the data editor's per-generation workers. */
export interface FileCompletionStore extends SftCompletionStore {
    /** Why the file could not be read or written, if it could not; the store then keeps answers in memory only. */
    readonly failure: string | undefined;
}

export interface OpenFileCompletionStoreOptions {
    /** Absolute directory the caller owns; created if missing. */
    directory: string;
    /** Separates model revisions: answers of one model never serve another. */
    namespace: string;
    /** Entries kept; the oldest leave first. */
    maximumEntries?: number;
    /** Size at which the file is rewritten with the entries kept. */
    maximumBytes?: number;
}

const KEY = /^[0-9a-f]{64}$/u;
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
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
            return undefined;
        }
        const { k, v } = entry as Record<string, unknown>;
        return typeof k === 'string' && KEY.test(k) && typeof v === 'string' && v.length <= MAXIMUM_ANSWER_LENGTH
            ? [k, v]
            : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Open (or create) a bounded, append-only answer store in a caller-owned directory. The file holds one
 * `{"k": <sha256 key>, "v": <completion>}` line per answer; malformed lines are skipped, a symbolic link or
 * an oversized file is refused, and a file that grows past `maximumBytes` is rewritten atomically with the
 * entries kept. Any file error leaves a working in-memory store and records `failure`.
 *
 * @param options directory, namespace and bounds
 * @returns the store
 */
export function openFileCompletionStore(options: OpenFileCompletionStoreOptions): FileCompletionStore {
    const maximumEntries = options.maximumEntries ?? 20_000;
    const maximumBytes = options.maximumBytes ?? 16 * 1024 * 1024;
    const entries = new Map<string, string>();
    let failure: string | undefined;
    let bytes = 0;
    const path = join(
        options.directory,
        `answers-${createHash('sha256').update(options.namespace).digest('hex').slice(0, 16)}.jsonl`
    );
    const remember = (key: string, answer: string): void => {
        entries.delete(key);
        entries.set(key, answer);
        if (entries.size > maximumEntries) {
            const oldest = entries.keys().next();
            if (!oldest.done) {
                entries.delete(oldest.value);
            }
        }
    };
    try {
        if (!isAbsolute(options.directory)) {
            throw new TypeError('the answer cache directory must be absolute');
        }
        mkdirSync(options.directory, { recursive: true, mode: 0o700 });
        let existing: ReturnType<typeof lstatSync> | undefined;
        try {
            existing = lstatSync(path);
        } catch {
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
            }
        }
    } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
    }
    const rewrite = (): void => {
        const temporary = `${path}.${process.pid}.tmp`;
        const content = [...entries].map(([k, v]) => JSON.stringify({ k, v })).join('\n');
        writeFileSync(temporary, content ? `${content}\n` : '', { mode: 0o600 });
        renameSync(temporary, path);
        bytes = Buffer.byteLength(content) + 1;
    };
    return Object.freeze({
        get failure() {
            return failure;
        },
        get: (key: string) => entries.get(key),
        set: (key: string, answer: string) => {
            if (!KEY.test(key) || answer.length > MAXIMUM_ANSWER_LENGTH) {
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
                failure = error instanceof Error ? error.message : String(error);
            }
        }
    });
}
