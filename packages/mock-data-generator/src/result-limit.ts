import type { MockDataGeneratorResult } from './types.js';

/** Keep complete generation inside the standard FE host's aggregate result ceiling. */
export const MAX_GENERATED_RESULT_BYTES = 64 * 1024 * 1024;

/** Stable, privacy-safe failure raised before an oversized snapshot can be cached or published. */
export class GeneratedResultTooLargeError extends RangeError {
    public readonly code = 'GENERATED_RESULT_TOO_LARGE' as const;
    public readonly maxBytes: number;
    public readonly actualBytes: number;

    /**
     * Create a bounded-result failure without retaining result content.
     *
     * @param actualBytes Serialized UTF-8 bytes observed.
     * @param maxBytes Maximum permitted serialized UTF-8 bytes.
     */
    constructor(actualBytes: number, maxBytes = MAX_GENERATED_RESULT_BYTES) {
        super(`Generated result exceeds the ${maxBytes}-byte limit (received ${actualBytes} bytes).`);
        this.name = 'GeneratedResultTooLargeError';
        this.maxBytes = maxBytes;
        this.actualBytes = actualBytes;
    }
}

/**
 * Measure the complete JSON result as UTF-8 before it crosses a host publication boundary.
 *
 * @param result Complete generated service result.
 */
export function assertGeneratedResultWithinLimit(result: MockDataGeneratorResult): void {
    const source = JSON.stringify(result);
    const actualBytes = Buffer.byteLength(source, 'utf8');
    if (actualBytes > MAX_GENERATED_RESULT_BYTES) {
        throw new GeneratedResultTooLargeError(actualBytes);
    }
}
