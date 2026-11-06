import type { MockDataGeneratorResult } from './types.js';
import { MAX_GENERATED_RESULT_BYTES } from './limits.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';

export { MAX_GENERATED_RESULT_BYTES } from './limits.js';

/** Stable, privacy-safe failure raised before an oversized snapshot can be cached or published. */
class GeneratedResultTooLargeError extends MockGenError {
    public readonly maxBytes: number;
    public readonly actualBytes: number;

    /**
     * Create a bounded-result failure without retaining result content.
     *
     * @param actualBytes Serialized UTF-8 bytes observed.
     * @param maxBytes Maximum permitted serialized UTF-8 bytes.
     */
    constructor(actualBytes: number, maxBytes = MAX_GENERATED_RESULT_BYTES) {
        super(
            MOCKGEN_ERROR_CODE.GENERATED_RESULT_TOO_LARGE,
            `Generated result exceeds the ${maxBytes}-byte limit (received ${actualBytes} bytes).`
        );
        this.name = 'GeneratedResultTooLargeError';
        this.maxBytes = maxBytes;
        this.actualBytes = actualBytes;
    }
}

/**
 * Measure the complete JSON result as UTF-8 before it crosses a host publication boundary.
 *
 * @param result Complete generated service result.
 * @returns The measured size in bytes, so later checks need not serialize the result again.
 */
export function assertGeneratedResultWithinLimit(result: MockDataGeneratorResult): number {
    const source = JSON.stringify(result);
    const actualBytes = Buffer.byteLength(source, 'utf8');
    if (actualBytes > MAX_GENERATED_RESULT_BYTES) {
        throw new GeneratedResultTooLargeError(actualBytes);
    }
    return actualBytes;
}
