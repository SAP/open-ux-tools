import type { SchemaEntity, SchemaProperty } from '../../src/schema/graph.js';
import { semanticRoleCandidate } from '../../src/semantics/lexical-fallback.js';

function candidate(name: string, primitiveType: SchemaProperty['primitiveType'] = 'string'): string | undefined {
    const property: SchemaProperty = { name, primitiveType, nullable: true, isKey: false, annotations: [] };
    const entity = {
        name: 'Item',
        entitySetName: 'Items',
        properties: [property],
        keys: [],
        annotations: []
    } as unknown as SchemaEntity; // only the fields the lexical fallback reads
    return semanticRoleCandidate(entity, property);
}

describe('lexical fallback word matching', () => {
    it.each([
        ['CustomerCommentText', 'comment'],
        ['RemarkLine', 'remark'],
        ['NotesSection', 'notes']
    ])('routes %s to the narrative role it names, not to its last word', (name, role) => {
        // Given a narrative field whose last word is not a role
        // When the lexical fallback routes it
        // Then the role is the narrative word it contains
        expect(candidate(name)).toBe(role);
    });

    it('does not treat the letters "has" inside another word as the word "has"', () => {
        // Given a status field whose name contains "has" only inside "Phase"
        // When the lexical fallback routes it
        // Then it is an ordinary status, not an indicator
        expect(candidate('PhaseErrorStatus')).toBe('status');
    });

    it('routes a status field with the word "has" to an indicator', () => {
        // Given a status field that starts with the word "Has"
        // Then it is an indicator
        expect(candidate('HasErrorStatus')).toBe('indicator');
    });

    it('does not read the English article "an" as a business network identifier', () => {
        // Given a field named with the article "an"
        // When the lexical fallback routes it
        // Then it is not a business network identifier
        expect(candidate('AnOrderNumber')).not.toBe('business_network_id');
    });
});
