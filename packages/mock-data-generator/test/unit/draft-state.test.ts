import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeDraftValue, isDraftEnabled } from '../../src/generation/draft-state.js';
import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import { parseEdmx } from '../../src/schema/edmx.js';

const FIXTURES = fileURLToPath(new URL('./fixtures', import.meta.url));
const graph = parseEdmx(readFileSync(join(FIXTURES, 'draft-composition.metadata.xml'), 'utf8'));
const root = graph.entities.find(({ entitySetName }) => entitySetName === 'Qas');
const administration = graph.entities.find(({ entitySetName }) => entitySetName === 'DraftAdministrativeData');

describe('the draft state of a mock data row', () => {
    it('is that of an active instance without a draft', () => {
        // Given a draft-enabled entity
        expect(root && isDraftEnabled(root)).toBe(true);
        const value = (name: string): unknown => {
            const property = root?.properties.find((candidate) => candidate.name === name);
            return root && property ? activeDraftValue(root, property) : 'missing';
        };
        // Then its draft administration fields describe an active row, and its business fields are left alone
        expect(value('IsActiveEntity')).toBe(true);
        expect(value('HasActiveEntity')).toBe(true);
        expect(value('HasDraftEntity')).toBe(false);
        expect(value('DraftAdministrativeData_DraftUUID')).toBeNull();
        expect(value('Qn')).toBeUndefined();
    });

    it('leaves the draft administration data itself alone', () => {
        // Given the draft administration entity, keyed by its own draft UUID
        const key = administration?.properties.find(({ isKey }) => isKey);
        // Then it is no draft-enabled entity and its key is generated like any key
        expect(administration && isDraftEnabled(administration)).toBe(false);
        expect(administration && key ? activeDraftValue(administration, key) : 'missing').toBeUndefined();
    });

    it('is checked on every generated row', () => {
        // Given a draft row and an active row that claims a draft
        const resources = {
            Qas: [
                {
                    ID: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d01',
                    IsActiveEntity: false,
                    HasActiveEntity: true,
                    HasDraftEntity: false
                },
                {
                    ID: '0f1b4c6e-1d2a-4b3c-8d4e-5f6a7b8c9d02',
                    IsActiveEntity: true,
                    HasActiveEntity: true,
                    HasDraftEntity: true
                }
            ]
        };
        // When the realism checks assess them
        const { findings } = assessRealism({ graph, resources, checks: new Set([REALISM_CHECK.draftState]) });
        // Then both draft fields are reported
        expect(findings.map(({ property }) => property).sort()).toEqual(
            ['DraftAdministrativeData_DraftUUID', 'HasDraftEntity', 'IsActiveEntity'].sort()
        );
    });
});
