import { generateServiceForTesting } from '../../src/index.js';
import type { MockDataGenerationProgress, MockDataServiceRequest, SemanticClassification } from '../../src/types.js';

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0" encoding="utf-8"?>
            <edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                <edmx:DataServices>
                    <Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                        <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record" /></EntityContainer>
                        <EntityType Name="Record">
                            <Key><PropertyRef Name="ID" /></Key>
                            <Property Name="ID" Type="Edm.Int32" Nullable="false" />
                            <Property Name="Label" Type="Edm.String" Nullable="false" />
                        </EntityType>
                    </Schema>
                </edmx:DataServices>
            </edmx:Edmx>`
    },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};

describe('generation progress events', () => {
    it('preserves tier ordering and ignores observer exceptions', async () => {
        const events: string[] = [];
        const result = await generateServiceForTesting(
            request,
            { mode: 'deterministic', rowsPerEntity: 1 },
            {
                onProgress: (event) => {
                    events.push(`${event.tier}:${event.phase}`);
                    throw new Error('observer failure');
                }
            }
        );

        expect(result.resources.Records).toHaveLength(1);
        expect(events).toEqual(['T0:start', 'T1:start', 'T1:complete', 'T0:complete', 'T3:complete']);
    });

    it('reports the span of each tier, not of the tiers it encloses or follows', async () => {
        // Given a classifier and a model that each take a known time
        const pause = 300;
        const wait = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, pause));
        const events: MockDataGenerationProgress[] = [];
        await generateServiceForTesting(
            request,
            { seed: 1, rowsPerEntity: 1 },
            {
                onProgress: (event) => events.push(event),
                classifier: {
                    fingerprint: 'slow-classifier',
                    classify: async (): Promise<SemanticClassification> => {
                        await wait();
                        return {
                            role: 'unknown',
                            confidence: 1,
                            source: 'unknown',
                            top: [{ role: 'unknown', confidence: 1 }]
                        };
                    }
                },
                sft: {
                    fingerprint: 'slow-model',
                    generate: async (input) => {
                        await wait();
                        return { rows: Array.from({ length: input.rowCount }, () => ({})) };
                    }
                }
            }
        );
        const span = (tier: string): number =>
            events.find((event) => event.tier === tier && event.phase === 'complete')?.durationMs ?? Number.NaN;
        // Then the classification shows in T1 alone, and the model run in neither T0 nor T3
        expect(span('T1')).toBeGreaterThanOrEqual(pause - 20);
        expect(span('T0')).toBeLessThan(pause);
        expect(span('T3')).toBeLessThan(pause);
    });
});
