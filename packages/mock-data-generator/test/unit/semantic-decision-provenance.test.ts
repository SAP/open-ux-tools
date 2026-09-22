import { generateService, inspectService, type SemanticClassifier } from '../../src/index.js';

const metadata = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Example">
      <EntityType Name="Record">
        <Key><PropertyRef Name="ID"/></Key>
        <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="ApprovalStatus" Type="Edm.String" Nullable="false" MaxLength="1"/>
      </EntityType>
      <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Example.Record"/></EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

describe('semantic decision provenance', () => {
    const classifier: SemanticClassifier = {
        fingerprint: 'provider-separation-test',
        classify: async (input) =>
            input.propertyName === 'ApprovalStatus'
                ? {
                      role: 'approval_status',
                      source: 'classifier',
                      confidence: 0.99,
                      routeThreshold: 0.9,
                      predictionSetSize: 1,
                      predictionSet: ['approval_status'],
                      top: [{ role: 'approval_status', confidence: 0.99 }]
                  }
                : { role: 'unknown', source: 'unknown', confidence: 1 }
    };
    const request = {
        metadata: { format: 'edmx' as const, content: metadata },
        service: { urlPath: '/records', odataVersion: '4.0' as const },
        targets: [{ name: 'Records', kind: 'entity-set' as const }],
        existingData: {}
    };

    it('keeps a detected application role separate from an unavailable domain provider', async () => {
        const inspection = await inspectService(
            request,
            { pipeline: 'semantic-v2', rowsPerEntity: 2, seed: 1 },
            { classifier }
        );
        const status = inspection.fieldDecisions.find(({ property }) => property === 'ApprovalStatus');

        expect(status).toMatchObject({
            classifierPrediction: { role: 'approval_status', confidence: 0.99, routeThreshold: 0.9 },
            detectedRole: 'approval_status',
            detectionSource: 'classifier',
            acceptedRole: undefined,
            providerState: 'not-selected',
            providerRejectionReason: 'unsupported-domain'
        });
        expect(inspection.coverage.routedFields).toBe(0);
        expect(inspection.coverage.unsupportedFields).toBe(2);
    });

    it('reports accepted detection and provider binding as different counts', async () => {
        const result = await generateService(
            request,
            { pipeline: 'semantic-v2', rowsPerEntity: 2, seed: 1 },
            { classifier }
        );

        expect(result.routing).toMatchObject({
            totalFields: 2,
            classifierAccepted: 1,
            providerBound: 0,
            detectedButUnbound: 1
        });
        const routing = result.routing;
        if (!routing) {
            throw new Error('Semantic routing statistics are missing');
        }
        expect(
            routing.metadataAccepted +
                routing.classifierAccepted +
                routing.lexicalAccepted +
                routing.conceptAccepted +
                routing.abstained
        ).toBe(routing.totalFields);
    });
});
