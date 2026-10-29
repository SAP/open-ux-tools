import type { MockDataMetadata, MockDataServiceIdentity } from '../types.js';
import { parseCsn } from './csn.js';
import { parseEdmx } from './edmx.js';
import type { SchemaGraph } from './graph.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../errors.js';

/** Metadata formats the generator accepts, in the order they are reported to callers. */
export const METADATA_FORMATS: ReadonlyArray<MockDataMetadata['format']> = ['edmx', 'csn'];

/**
 * Parse service metadata into the schema graph, dispatching on the declared format.
 * An unknown format is rejected instead of being handed to a parser that cannot read it.
 *
 * @param metadata the request metadata
 * @param service the requested service; selects the CAP service when a CSN document defines several
 * @returns the parsed schema graph
 */
export function parseServiceMetadata(metadata: MockDataMetadata, service?: MockDataServiceIdentity): SchemaGraph {
    switch (metadata.format) {
        case 'edmx':
            return parseEdmx(metadata.content);
        case 'csn':
            return parseCsn(metadata.content, { alias: service?.alias, urlPath: service?.urlPath });
        default:
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.METADATA_INVALID,
                `MockGen metadata format must be one of ${METADATA_FORMATS.join(', ')}; received ${JSON.stringify(
                    // The switch is exhaustive for typed callers; untyped hosts can still pass any format.
                    (metadata as { format?: unknown }).format
                )}`
            );
    }
}
