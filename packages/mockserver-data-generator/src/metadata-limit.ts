import { Buffer } from 'node:buffer';
import type { MockDataMetadata } from './types.js';

/** Maximum UTF-8 size accepted for one EDMX or CSN input. */
export const MAX_METADATA_INPUT_BYTES = 32 * 1024 * 1024;

/** Stable failure raised before oversized metadata reaches hashing or a schema parser. */
export class MetadataInputTooLargeError extends RangeError {
    readonly code = 'METADATA_INPUT_TOO_LARGE';

    constructor(
        readonly maxBytes: number,
        readonly actualBytes: number
    ) {
        super(`Metadata input exceeds the ${maxBytes}-byte limit (received ${actualBytes} bytes).`);
        this.name = 'MetadataInputTooLargeError';
    }
}

/**
 * Reject metadata whose UTF-8 representation exceeds the fixed production ceiling.
 *
 * @param metadata EDMX or CSN metadata supplied by a caller.
 */
export function assertMetadataInputWithinLimit(metadata: Pick<MockDataMetadata, 'content'>): void {
    const actualBytes = Buffer.byteLength(metadata.content, 'utf8');
    if (actualBytes > MAX_METADATA_INPUT_BYTES) {
        throw new MetadataInputTooLargeError(MAX_METADATA_INPUT_BYTES, actualBytes);
    }
}

/** Identify the stable metadata-limit failure without relying on cross-module `instanceof`. */
export function isMetadataInputTooLargeError(error: unknown): error is MetadataInputTooLargeError {
    return error !== null && typeof error === 'object' && 'code' in error && error.code === 'METADATA_INPUT_TOO_LARGE';
}
