import { compileSemanticPlan } from '../../src/generation/semantic-plan.js';
import { generateService } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { SemanticClassification, SftGenerator } from '../../src/types.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Address"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="PhoneExtensionNumber" Type="Edm.String" MaxLength="10"/>
<Property Name="FaxExtensionNumber" Type="Edm.String" MaxLength="10"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityType Name="Note"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Remark" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityContainer Name="Container">
<EntitySet Name="Addresses" EntityType="Demo.Address"/>
<EntitySet Name="Notes" EntityType="Demo.Note"/>
</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

describe('concept fallback for demoted roles', () => {
    it('fills a recognized role that no provider can serve from the field concept instead of the typed floor', () => {
        const graph = parseEdmx(metadata);
        const concept = { id: 'phone-extension', similarity: 0.92, margin: 0.2 };
        const decisions = new Map<string, SemanticClassification>([
            // `phone` needs at least 16 characters, so a 10-character extension column cannot take it.
            ['Addresses.PhoneExtensionNumber', { role: 'phone', confidence: 1, source: 'metadata', concept }],
            ['Addresses.FaxExtensionNumber', { role: 'phone', confidence: 1, source: 'metadata' }]
        ]);
        const diagnostics: Parameters<typeof compileSemanticPlan>[2] = [];
        const plan = compileSemanticPlan(graph, decisions, diagnostics);
        expect(plan.get('Addresses.PhoneExtensionNumber')).toMatchObject({ source: 'concept', concept });
        // Without a concept the field still abstains as before.
        expect(plan.get('Addresses.FaxExtensionNumber')).toMatchObject({ role: 'unknown', source: 'unknown' });
    });
});

describe('fine-tuned time budget', () => {
    it('stops calling the model once an attempt has used the service budget', async () => {
        const generate = jest.fn<SftGenerator['generate']>(async (input) => {
            await new Promise((resolve) => setTimeout(resolve, 80));
            return {
                rows: Array.from({ length: input.rowCount }, () => ({ Remark: 'Customer asked for a call back' }))
            };
        });
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/notes', odataVersion: '4.0' },
                targets: [
                    { name: 'Addresses', kind: 'entity-set' },
                    { name: 'Notes', kind: 'entity-set' }
                ],
                existingData: {}
            },
            { pipeline: 'semantic-v2', seed: 2, rowsPerEntity: 2, sftBudgetMs: 60 },
            { sft: { fingerprint: 'slow-model', generate } }
        );
        expect(generate).toHaveBeenCalledTimes(1);
        expect(result.diagnostics.some(({ code }) => code === 'SFT_BUDGET_EXHAUSTED')).toBe(true);
    });
});
