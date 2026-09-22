import { readFile } from 'node:fs/promises';
import { createMockDataGenerator } from '../../src/index.js';
import type { MockDataServiceRequest } from '../../src/types.js';

/**
 * Data Editor validates generator results with strict equalities before any file is replaced.
 * These regressions keep the standalone coverage figures consistent with routing statistics.
 */
const ambiguous = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Mix">
    <EntityType Name="Case"><Key><PropertyRef Name="CaseUUID"/></Key>
      <Property Name="CaseUUID" Type="Edm.Guid" Nullable="false"/>
      <Property Name="LifecycleStatus" Type="Edm.String" MaxLength="2"/>
      <Property Name="ContactEmail" Type="Edm.String" MaxLength="241"/>
      <Property Name="CountryCode" Type="Edm.String" MaxLength="3"/>
      <Property Name="Amount" Type="Edm.Decimal" Precision="15" Scale="2"/>
      <Property Name="Currency" Type="Edm.String" MaxLength="5"/>
      <Property Name="Remark" Type="Edm.String" MaxLength="200"/>
      <Property Name="OpenedOn" Type="Edm.Date"/>
      <Property Name="ClosedOn" Type="Edm.Date"/>
      <Property Name="Priority" Type="Edm.Byte"/>
      <Property Name="Name" Type="Edm.String" MaxLength="40"/>
    </EntityType>
    <EntityContainer Name="C"><EntitySet Name="Cases" EntityType="Mix.Case"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`;

async function request(content: string, odataVersion: '2.0' | '4.0'): Promise<MockDataServiceRequest> {
    return {
        metadata: { format: 'edmx', content },
        service: { urlPath: '/invariant', odataVersion },
        targets: [...content.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => ({
            name: match[1],
            kind: 'entity-set' as const
        })),
        existingData: {}
    };
}

describe('routing and semantic coverage invariants', () => {
    test.each([
        ['ambiguous names', async () => request(ambiguous, '4.0')],
        [
            'finance metadata',
            async () => request(await readFile('test/unit/finance-manage.metadata.xml', 'utf8'), '4.0')
        ]
    ])('keeps unsupported coverage equal to unbound routing for %s', async (_name, build) => {
        const generator = await createMockDataGenerator({ executionMode: 'api' });
        try {
            const result = await generator.generateService(await build(), {
                mode: 'deterministic',
                seed: 11,
                rowsPerEntity: 2
            });
            const routing = result.routing;
            if (!routing) {
                throw new Error('routing statistics are required');
            }
            expect(result.semanticCoverage.eligibleFields).toBe(routing.totalFields);
            expect(result.semanticCoverage.unsupportedFields).toBe(routing.totalFields - routing.providerBound);
            expect(result.semanticCoverage.formatValidatedFields).toBeLessThanOrEqual(routing.providerBound);
            expect(
                routing.metadataAccepted +
                    routing.classifierAccepted +
                    routing.lexicalAccepted +
                    routing.conceptAccepted +
                    routing.abstained
            ).toBe(routing.totalFields);
        } finally {
            await generator.dispose();
        }
    });
});
