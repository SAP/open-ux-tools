import { compileSemanticPlan, semanticValueIsValid } from '../../src/generation/semantic-plan.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import { semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';
import type { SemanticClassification } from '../../src/types.js';

const property = (name: string, options: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: false,
    isKey: false,
    annotations: [],
    ...options
});

const classified = (role: string): SemanticClassification => ({
    role,
    confidence: 0.99,
    source: 'classifier',
    routeThreshold: 0.4,
    predictionSetSize: 1,
    predictionSet: [role],
    top: [{ role, confidence: 0.99 }]
});

const HASHES = Array.from({ length: 50 }, (_, index) => (index * 2_654_435_761) % 4_294_967_296);

describe('role values that fit their field', () => {
    it.each([20, 24, 30])('writes a whole URL into a field of %i characters', (maxLength) => {
        // Given a URL field shorter than most organisation pages
        const field = property('IconURL', { maxLength });

        // When URLs are generated for many rows
        const values = HASHES.map((hash) => semanticValue('url', field, semanticRowContext(hash), hash));

        // Then every value is a whole URL the field holds
        expect(values.every((value) => typeof value === 'string' && semanticValueIsValid('url', field, value))).toBe(
            true
        );
    });

    it('keeps the organisation page when it fits', () => {
        // Given a URL field without a length
        const field = property('Homepage');

        // When a URL is generated
        const value = semanticValue('url', field, semanticRowContext(HASHES[1]), HASHES[1]);

        // Then it is a page below the site, not the bare site
        expect(value).toMatch(/^https:\/\/example\.com\/.+/u);
    });

    it('withdraws a URL role from a field too short for the shortest URL', () => {
        // Given a URL field of twelve characters
        const records: SchemaEntity = {
            name: 'Record',
            entitySetName: 'Records',
            properties: [property('ID', { isKey: true }), property('IconURL', { maxLength: 12 })]
        };
        const graph: SchemaGraph = { namespace: 'Demo', entities: [records], relationships: [] };

        // When the plan is compiled
        const planned = compileSemanticPlan(graph, new Map([['Records.IconURL', classified('url')]]), []);

        // Then the role is not claimed
        expect(planned.get('Records.IconURL')?.role).toBe('unknown');
    });

    it('gives the text sibling of a code the role naming the code', () => {
        // Given a currency code and its one-word text sibling, which a classifier routed as a currency code
        const projects: SchemaEntity = {
            name: 'Project',
            entitySetName: 'Projects',
            properties: [
                property('ID', { isKey: true }),
                property('Currency', { maxLength: 5 }),
                property('Currencyname', { maxLength: 40 })
            ]
        };
        const graph: SchemaGraph = { namespace: 'Demo', entities: [projects], relationships: [] };

        // When the plan is compiled
        const planned = compileSemanticPlan(
            graph,
            new Map([
                ['Projects.Currency', classified('currency')],
                ['Projects.Currencyname', classified('currency')]
            ]),
            []
        );

        // Then the code keeps the code role and its text holds the name of the currency
        expect(planned.get('Projects.Currency')?.role).toBe('currency');
        expect(planned.get('Projects.Currencyname')?.role).toBe('currency_name');
    });
});
