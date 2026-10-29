import { generateServiceForTesting as generate } from '../../src/index.js';
import type { MockDataServiceRequest, SemanticClassification, SftGenerator } from '../../src/types.js';

/**
 * A service of one entity with a free-text field and a name field.
 *
 * @returns the request
 */
function request(): MockDataServiceRequest {
    return {
        metadata: {
            format: 'csn',
            content: JSON.stringify({
                definitions: {
                    'Offer.Incidents': {
                        kind: 'entity',
                        elements: {
                            ID: { key: true, type: 'cds.Integer', notNull: true },
                            title: { type: 'cds.String', length: 100 },
                            description: { type: 'cds.String', length: 500 }
                        }
                    }
                }
            })
        },
        service: { urlPath: '/offer', odataVersion: '4.0' },
        targets: [{ name: 'Incidents', kind: 'entity-set' }],
        existingData: {}
    };
}

describe('model tier and abstained fields', () => {
    it('offers the model every field no deterministic tier gave a value', async () => {
        // Given a model that writes a sentence into every field it is asked for
        const asked: string[] = [];
        const sft: SftGenerator = {
            fingerprint: 'sft-test',
            generate: async (input) => {
                asked.push(...input.fields.map(({ name }) => name));
                return {
                    rows: Array.from({ length: input.rowCount }, (_, row) =>
                        Object.fromEntries(input.fields.map(({ name }) => [name, `Server outage in region ${row + 1}`]))
                    )
                };
            }
        };

        // And a classifier that routes the description field to the description role with full confidence
        const classifier = {
            fingerprint: 'sft-abstained-test',
            classify: async (input: { propertyName: string }): Promise<SemanticClassification> =>
                input.propertyName === 'description'
                    ? { role: 'description', confidence: 1, source: 'classifier' }
                    : { role: 'unknown', confidence: 1, source: 'unknown', top: [{ role: 'unknown', confidence: 1 }] }
        };

        // When rows are generated with the packaged sample set, whose description samples abstain
        const result = await generate(request(), { seed: 1, rowsPerEntity: 3 }, { sft, classifier });

        // Then the description field is asked for and filled, not left empty
        expect(asked).toContain('description');
        result.resources.Incidents.forEach((row) => {
            expect(row.description).toEqual(expect.stringContaining('Server outage'));
        });
    });
});
