import { coherencePropertyNames } from '../../src/generation/coherence.js';
import type { SchemaEntity, SchemaProperty } from '../../src/schema/graph.js';
import type { SyntheticCoherenceRule } from '../../src/types.js';

function property(
    name: string,
    primitiveType: SchemaProperty['primitiveType'],
    links?: SchemaProperty['links']
): SchemaProperty {
    return {
        name,
        primitiveType,
        nullable: true,
        isKey: false,
        annotations: [],
        ...(links ? { links } : {})
    };
}

function entity(properties: ReadonlyArray<SchemaProperty>): SchemaEntity {
    return { name: 'Document', entitySetName: 'Documents', properties };
}

describe('coherencePropertyNames rule selection', () => {
    it('leaves recognized status pairs available when status coherence is inactive', () => {
        const document = entity([
            property('OverallStatus', 'string'),
            property('OverallStatusText', 'string'),
            property('BookingStatus', 'string'),
            property('BookingStatusText', 'string')
        ]);

        const names = coherencePropertyNames(document, ['temporal']);

        expect(names).not.toContain('OverallStatus');
        expect(names).not.toContain('OverallStatusText');
        expect(names).not.toContain('BookingStatus');
        expect(names).not.toContain('BookingStatusText');
    });

    it('reserves recognized status pairs when status coherence is active', () => {
        const document = entity([
            property('OverallStatus', 'string'),
            property('OverallStatusText', 'string'),
            property('BookingStatus', 'string'),
            property('BookingStatusText', 'string')
        ]);

        expect([...coherencePropertyNames(document, ['status'])]).toEqual(
            expect.arrayContaining(['OverallStatus', 'OverallStatusText', 'BookingStatus', 'BookingStatusText'])
        );
    });

    it('reserves only explicitly currency-linked amounts when monetary coherence is inactive', () => {
        const document = entity([
            property('Currency', 'string'),
            property('LinkedAmount', 'decimal', { currency: 'Currency' }),
            property('NarrativeAmount', 'decimal')
        ]);
        const selectedRules: readonly SyntheticCoherenceRule[] = ['temporal'];

        const names = coherencePropertyNames(document, selectedRules);

        expect(names).toContain('LinkedAmount');
        expect(names).not.toContain('NarrativeAmount');
    });

    it('reserves all monetary amounts when monetary coherence is active', () => {
        const document = entity([
            property('Currency', 'string'),
            property('LinkedAmount', 'decimal', { currency: 'Currency' }),
            property('NarrativeAmount', 'decimal')
        ]);

        expect([...coherencePropertyNames(document, ['monetary'])]).toEqual(
            expect.arrayContaining(['LinkedAmount', 'NarrativeAmount'])
        );
    });
});
