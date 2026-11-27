import { parseEdmx } from '../../src/schema/edmx.js';
import { describeReferencedServices } from '../../src/generation/referenced-code-lists.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from '../../src/errors.js';

const edmx = (schemaBody: string, prolog = ''): string =>
    `<?xml version="1.0" encoding="utf-8"?>${prolog}<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">${schemaBody}</Schema></edmx:DataServices></edmx:Edmx>`;

const MALFORMED: ReadonlyArray<readonly [string, string]> = [
    [
        'an unclosed tag',
        '<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo"'
    ],
    [
        'an external entity',
        edmx('<EntityType Name="&ext;"/>', '<!DOCTYPE edmx [<!ENTITY ext SYSTEM "file:///etc/hostname">]>')
    ],
    ['a tag named like a built-in object property', edmx('<__proto__ Name="x"/>')],
    ['nesting deeper than the parser allows', edmx(`${'<a>'.repeat(200)}${'</a>'.repeat(200)}`)]
];

/**
 * The error a call throws.
 * @param call the call
 * @returns what it threw
 */
function thrownBy(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        return error;
    }
    throw new Error('expected the call to throw');
}

describe('EDMX that cannot be parsed as XML', () => {
    it.each(MALFORMED)('is rejected as invalid metadata when it has %s', (_label, content) => {
        // Given a document the XML parser refuses

        // When it is parsed
        const error = thrownBy(() => parseEdmx(content));

        // Then the caller gets a coded error that keeps the parser's reason
        expect(error).toBeInstanceOf(MockGenError);
        expect(error).toMatchObject({ code: MOCKGEN_ERROR_CODE.METADATA_INVALID });
        expect((error as MockGenError).cause).toBeInstanceOf(Error);
    });

    it.each(MALFORMED)(
        'is rejected as invalid metadata by describeReferencedServices when it has %s',
        (_label, content) => {
            // Given a requested service whose metadata the XML parser refuses
            const request = {
                metadata: { format: 'edmx', content },
                service: { urlPath: '/srv/demo/', odataVersion: '4.0' }
            } as const;

            // When its referenced services are described
            const error = thrownBy(() => describeReferencedServices(request));

            // Then the caller gets the same coded error as from generation
            expect(error).toMatchObject({ code: MOCKGEN_ERROR_CODE.METADATA_INVALID });
        }
    );
});
