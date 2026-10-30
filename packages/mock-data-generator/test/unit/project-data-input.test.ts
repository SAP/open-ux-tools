import { parseGenerateProjectDataInput } from '../../src/project-data-input.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import type { MockDataMetadata } from '../../src/types.js';

const CSN = JSON.stringify({
    definitions: {
        'demo.Book': { kind: 'entity', elements: { ID: { key: true, type: 'cds.UUID' } } }
    }
});

function validInput(): Record<string, unknown> {
    return {
        projectRoot: '/project',
        dataDirectory: 'webapp/localService/mockdata',
        request: {
            metadata: { format: 'csn', content: CSN },
            service: { urlPath: '/odata/v4/catalog/', odataVersion: '4.0' },
            targets: [{ name: 'Book', kind: 'entity-set' }],
            existingData: {}
        }
    };
}

function withRequest(patch: Record<string, unknown>): Record<string, unknown> {
    const input = validInput();
    return { ...input, request: { ...(input.request as Record<string, unknown>), ...patch } };
}

describe('parseGenerateProjectDataInput', () => {
    it('accepts a well-formed request', () => {
        // Given a complete request document
        const input = validInput();
        // When it is parsed
        const parsed = parseGenerateProjectDataInput(input);
        // Then the typed input carries the same values
        expect(parsed.request.targets).toEqual([{ name: 'Book', kind: 'entity-set' }]);
        expect(parsed.dataDirectory).toBe('webapp/localService/mockdata');
    });

    it.each([
        ['a non-object document', [], /request document must be a JSON object/],
        ['a numeric data directory', { ...validInput(), dataDirectory: 7 }, /dataDirectory must be a string/],
        ['a missing project root', { ...validInput(), projectRoot: undefined }, /projectRoot must be a string/],
        [
            'a missing existingData record',
            withRequest({ existingData: undefined }),
            /request\.existingData must be an object/
        ],
        ['a JSON signal', withRequest({ signal: {} }), /request\.signal cannot be supplied/],
        [
            'an upper-case metadata format',
            withRequest({ metadata: { format: 'EDMX', content: '<x/>' } }),
            /request\.metadata\.format must be one of edmx, csn/
        ],
        [
            'non-string metadata content',
            withRequest({ metadata: { format: 'edmx', content: 1 } }),
            /request\.metadata\.content must be a string/
        ],
        [
            'an unknown OData version',
            withRequest({ service: { urlPath: '/x/', odataVersion: '3.0' } }),
            /request\.service\.odataVersion must be one of 2\.0, 4\.0/
        ],
        [
            'a non-string service alias',
            withRequest({ service: { urlPath: '/x/', odataVersion: '4.0', alias: 1 } }),
            /request\.service\.alias must be a string/
        ],
        ['targets that are not a list', withRequest({ targets: {} }), /request\.targets must be a list/],
        [
            'a target with an unknown kind',
            withRequest({
                targets: [
                    { name: 'Book', kind: 'entity-set' },
                    { name: 'X', kind: 'table' }
                ]
            }),
            /request\.targets\[1\]\.kind must be one of entity-set, singleton/
        ],
        ['options that are not an object', { ...validInput(), options: 'fast' }, /options must be an object/]
    ])('rejects %s with the offending path', (_case, input, message) => {
        // Given a malformed request document
        // When it is parsed
        // Then the error names the path that is wrong
        expect(() => parseGenerateProjectDataInput(input)).toThrow(message);
    });
});

describe('parseServiceMetadata', () => {
    it('parses CSN metadata', () => {
        // Given CSN metadata
        const metadata: MockDataMetadata = { format: 'csn', content: CSN };
        // When it is parsed
        const graph = parseServiceMetadata(metadata);
        // Then the entity set is present
        expect(graph.entities.map(({ entitySetName }) => entitySetName)).toEqual(['Book']);
    });

    it.each(['EDMX', 'xml', undefined])('rejects the unsupported metadata format %s', (format) => {
        // Given metadata with a format that is neither edmx nor csn
        const metadata = { format, content: '<edmx:Edmx/>' } as unknown as MockDataMetadata;
        // When it is parsed
        // Then it fails with the accepted formats instead of falling through to the CSN parser
        expect(() => parseServiceMetadata(metadata)).toThrow(/metadata format must be one of edmx, csn/);
    });
});

describe('parseGenerateProjectDataInput existing data and options', () => {
    it('accepts every existing-data shape', () => {
        // Given existing data for each initial-row source
        const input = withRequest({
            existingData: {
                A: { contributor: { present: false }, initialRows: { source: 'none', present: false } },
                B: {
                    contributor: { present: true, hasInitialData: true },
                    initialRows: { source: 'json', rows: [{ ID: 1 }] }
                },
                C: {
                    contributor: { present: true, hasInitialData: false },
                    initialRows: { source: 'contributor', enumerable: false }
                },
                D: {
                    contributor: { present: false },
                    initialRows: { source: 'contributor', enumerable: true, rows: [] }
                }
            }
        });
        // When it is parsed
        const parsed = parseGenerateProjectDataInput({ ...input, options: { mode: 'deterministic', seed: 7 } });
        // Then each entry keeps its shape and the options pass through
        expect(parsed.request.existingData.B.initialRows).toEqual({ source: 'json', present: true, rows: [{ ID: 1 }] });
        expect(parsed.request.existingData.C.initialRows).toEqual({
            source: 'contributor',
            present: true,
            enumerable: false
        });
        expect(parsed.options).toEqual({ mode: 'deterministic', seed: 7 });
    });

    it.each([
        [
            'an unknown row source',
            withRequest({ existingData: { A: { contributor: { present: false }, initialRows: { source: 'db' } } } }),
            /request\.existingData\.A\.initialRows\.source must be one of none, json, contributor/
        ],
        [
            'json rows that are not a list',
            withRequest({
                existingData: { A: { contributor: { present: false }, initialRows: { source: 'json', rows: 1 } } }
            }),
            /request\.existingData\.A\.initialRows\.rows must be a list/
        ],
        [
            'a contributor without a presence flag',
            withRequest({ existingData: { A: { contributor: {}, initialRows: { source: 'none' } } } }),
            /request\.existingData\.A\.contributor\.present must be a boolean/
        ],
        [
            'an unknown option',
            { ...validInput(), options: { fast: true } },
            /options\.fast is not a supported generation option/
        ],
        [
            'an unknown mode',
            { ...validInput(), options: { mode: 'quick' } },
            /options\.mode must be one of auto, deterministic, learned/
        ]
    ])('rejects %s', (_case, input, message) => {
        // Given a request document with malformed existing data or options
        // When it is parsed
        // Then the error names the offending path
        expect(() => parseGenerateProjectDataInput(input)).toThrow(message);
    });

    it('passes a resource root through and rejects one that is not a string', () => {
        // Given request documents with a string and with a numeric resource root
        const withRoot = { ...validInput(), resourceRoot: '/host/mockgen-resources' };
        const withNumber = { ...validInput(), resourceRoot: 5 };
        // When they are parsed
        // Then the string is kept for the session and the number is a coded request error
        expect(parseGenerateProjectDataInput(withRoot).resourceRoot).toBe('/host/mockgen-resources');
        expect(() => parseGenerateProjectDataInput(withNumber)).toThrow(
            expect.objectContaining({ code: 'REQUEST_INVALID', message: 'MockGen resourceRoot must be a string' })
        );
    });
});
