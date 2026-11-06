import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { compareCodePoints } from './ordering.js';
import { isRecord } from './guards.js';

/**
 * JSON with object keys in code-point order, so the text depends only on the value and never on how
 * the literal is written or on the host locale. Arrays keep their order; `undefined` array entries and
 * values render as `JSON.stringify` renders them.
 *
 * @param value a JSON-compatible value
 * @returns the canonical JSON text
 * @example
 * canonicalJson({ b: 1, a: [true, null] }); // '{"a":[true,null],"b":1}'
 */
export function canonicalJson(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (isRecord(value)) {
        // Any non-array object is read as a string-keyed record; only its own enumerable keys are serialized.
        return `{${Object.keys(value)
            .sort(compareCodePoints)
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

/**
 * SHA-256 of a text (encoded as UTF-8) or of raw bytes.
 *
 * @param data the text or bytes to hash
 * @returns the lowercase hexadecimal digest
 * @example
 * sha256('abc'); // 'ba7816bf…'
 */
export function sha256(data: string | Uint8Array): string {
    return createHash('sha256').update(data).digest('hex');
}

/**
 * The first 32 bits of the SHA-256 of a text, as an unsigned integer: a stable, seedable number for
 * deterministic choices.
 *
 * @param text the text to hash
 * @returns an integer in [0, 2^32)
 */
export function sha256Uint32(text: string): number {
    return createHash('sha256').update(text).digest().readUInt32BE(0);
}

/**
 * SHA-256 of a file, read as a stream so large model files are never held in memory at once.
 *
 * @param filePath the file to hash
 * @param signal optional cancellation, checked before each chunk
 * @returns the lowercase hexadecimal digest
 * @throws the read error, or the signal's reason once it is aborted
 */
export async function sha256File(filePath: string, signal?: AbortSignal): Promise<string> {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
        signal?.throwIfAborted();
        // A stream opened without an encoding yields Buffer chunks.
        digest.update(chunk as Buffer);
    }
    return digest.digest('hex');
}
