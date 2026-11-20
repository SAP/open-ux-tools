import { generateServiceForTesting } from '../../src/index.js';

// Property names carry no semantic evidence, so every value comes from the typed floor.
const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Test">
<EntityType Name="Sample"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Qzx" Type="Edm.Date"/><Property Name="Wvk" Type="Edm.DateTimeOffset"/><Property Name="Pjr" Type="Edm.TimeOfDay"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Samples" EntityType="Test.Sample"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/samples/', odataVersion: '4.0' },
    targets: [{ name: 'Samples', kind: 'entity-set' }],
    existingData: {}
} as const;

describe('typed date and time values', () => {
    it('draws year, month and time of day independently', async () => {
        // Given a service whose temporal fields have no semantic role
        // When many rows are generated
        const result = await generateServiceForTesting(request, { seed: 7, rowsPerEntity: 500, mode: 'deterministic' });
        const rows = result.resources.Samples;
        // Then the dates cover more year/month pairs than there are months
        const yearMonths = new Set(rows.map((row) => String(row.Qzx).slice(0, 7)));
        expect(yearMonths.size).toBeGreaterThan(36);
        // And the timestamps use minutes and seconds instead of whole hours
        const minutes = new Set(rows.map((row) => String(row.Wvk).slice(14, 16)));
        expect(minutes.size).toBeGreaterThan(30);
        // And hour and minute of a time value vary independently
        const hourMinutePairs = new Set(rows.map((row) => String(row.Pjr).slice(0, 5)));
        expect(hourMinutePairs.size).toBeGreaterThan(200);
    });
});
