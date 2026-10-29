import { Buffer } from 'node:buffer';
import type { MockDataMetadata } from './types.js';
import { MAX_METADATA_INPUT_BYTES } from './limits.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';

export { MAX_METADATA_INPUT_BYTES } from './limits.js';

/** Stable failure raised before oversized metadata reaches hashing or a schema parser. */
export class MetadataInputTooLargeError extends MockGenError {
    constructor(
        readonly maxBytes: number,
        readonly actualBytes: number
    ) {
        super(
            MOCKGEN_ERROR_CODE.METADATA_INPUT_TOO_LARGE,
            `Metadata input exceeds the ${maxBytes}-byte limit (received ${actualBytes} bytes).`
        );
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
