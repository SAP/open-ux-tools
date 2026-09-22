import { generateService } from '../../src/index.js';
import type { MockDataServiceRequest } from '../../src/types.js';

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
        const result = await generateService(
            request,
            { pipeline: 'semantic-v2', mode: 'deterministic', rowsPerEntity: 1 },
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
});
