import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import * as parseMetadata from '../../src/schema/parse-metadata.js';
import { mockStandaloneModelResources } from './synthetic-standalone-models.js';

const modelResources = await mockStandaloneModelResources();
const parseServiceMetadata = jest.fn(parseMetadata.parseServiceMetadata);
jest.unstable_mockModule(fileURLToPath(new URL('../../src/schema/parse-metadata.ts', import.meta.url)), () => ({
    ...parseMetadata,
    parseServiceMetadata
}));
const { createMockDataGenerator } = await import('../../src/public.js');
afterAll(modelResources.dispose);

describe('metadata parsing per generation', () => {
    it('parses the service metadata once per generated service', async () => {
        // Given a session and a one-entity service
        const generator = await createMockDataGenerator();
        parseServiceMetadata.mockClear();
        try {
            // When the service is generated
            const result = await generator.generateService(
                {
                    metadata: {
                        format: 'csn',
                        content: JSON.stringify({
                            definitions: {
                                'demo.Book': { kind: 'entity', elements: { ID: { key: true, type: 'cds.Integer' } } }
                            }
                        })
                    },
                    service: { urlPath: '/books', odataVersion: '4.0' },
                    targets: [{ name: 'Book', kind: 'entity-set' }],
                    existingData: {}
                },
                { mode: 'deterministic', seed: 1, rowsPerEntity: 2 }
            );
            // Then generation, validation and coverage share one parsed schema
            expect(result.resources.Book).toHaveLength(2);
            expect(result.semanticCoverage.eligibleFields).toBe(1);
            expect(parseServiceMetadata).toHaveBeenCalledTimes(1);
        } finally {
            await generator.dispose();
        }
    });
});
