import type { MockDataServiceRequest } from '../../src/types.js';
import { mockStandaloneModelResources } from './synthetic-standalone-models.js';

// The packaged manifest requires an onnxruntime-node version that is not installed.
const modelResources = await mockStandaloneModelResources({ runtimeVersion: '0.0.1' });
const { createMockDataGenerator } = await import('../../src/standalone.js');
afterAll(modelResources.dispose);

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
    <EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
      <Property Name="ID" Type="Edm.Int32" Nullable="false"/>
    </EntityType>
    <EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record"/></EntityContainer>
  </Schema></edmx:DataServices>
</edmx:Edmx>`
    },
    service: { urlPath: '/records', odataVersion: '4.0' },
    targets: [{ name: 'Records', kind: 'entity-set' }],
    existingData: {}
};

describe('MockGen ONNX runtime version check', () => {
    it('opens a session and generates deterministically without checking the native runtime', async () => {
        // Given a package whose manifest requires a native runtime version that is not installed
        // When a session opens and generates deterministically
        const generator = await createMockDataGenerator();
        try {
            const result = await generator.generateService(request, {
                mode: 'deterministic',
                seed: 1,
                rowsPerEntity: 1
            });
            // Then generation succeeds without runtime diagnostics
            expect(result.resources.Records).toHaveLength(1);
            expect(result.diagnostics.some(({ code }) => code.endsWith('_RUNTIME_UNAVAILABLE'))).toBe(false);
        } finally {
            await generator.dispose();
        }
    });

    it('reports the version mismatch for each model when models load, keeping the deterministic tier', async () => {
        // Given the same package
        const generator = await createMockDataGenerator();
        try {
            // When a request needs the models
            const result = await generator.generateService(request, { seed: 1, rowsPerEntity: 1 });
            // Then both models are reported unavailable, naming the required version, and no native session opens
            const unavailable = result.diagnostics.filter(({ code }) => code.endsWith('_RUNTIME_UNAVAILABLE'));
            expect(unavailable.map(({ code }) => code).sort()).toEqual([
                'CLASSIFIER_RUNTIME_UNAVAILABLE',
                'SFT_RUNTIME_UNAVAILABLE'
            ]);
            unavailable.forEach(({ message }) =>
                expect(message).toContain('onnxruntime-node 0.0.1 is required by model component')
            );
            expect(modelResources.allocateNativeSession).not.toHaveBeenCalled();
            expect(result.resources.Records).toHaveLength(1);
        } finally {
            await generator.dispose();
        }
    });
});
