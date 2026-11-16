import { generateService } from '../../src/public.js';
import type { ExistingMockData, MockDataRow, MockDataServiceRequest } from '../../src/types.js';

const edmx = (body: string): string =>
    `<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx"><edmx:DataServices><Schema Namespace="Demo" xmlns="http://docs.oasis-open.org/odata/ns/edm">${body}</Schema></edmx:DataServices></edmx:Edmx>`;

const supplied = (rows: ReadonlyArray<MockDataRow>): ExistingMockData => ({
    contributor: { present: false },
    initialRows: { source: 'json', present: true, rows }
});

const request = (
    body: string,
    target: string,
    existingRows: ReadonlyArray<MockDataRow> = []
): MockDataServiceRequest => ({
    metadata: { format: 'edmx', content: edmx(body) },
    service: { urlPath: '/demo', odataVersion: '4.0' },
    targets: [{ name: target, kind: 'entity-set' }],
    existingData: existingRows.length > 0 ? { [target]: supplied(existingRows) } : {}
});

const PRICES = `<EntityType Name="Price"><Key><PropertyRef Name="Material"/><PropertyRef Name="ValidityStartDate"/><PropertyRef Name="ValidityEndDate"/></Key>
<Property Name="Material" Type="Edm.String" Nullable="false" MaxLength="18"/>
<Property Name="ValidityStartDate" Type="Edm.Date" Nullable="false"/>
<Property Name="ValidityEndDate" Type="Edm.Date" Nullable="false"/>
<Property Name="Amount" Type="Edm.Decimal" Precision="10" Scale="2"/></EntityType>
<EntityContainer Name="C"><EntitySet Name="Prices" EntityType="Demo.Price"/></EntityContainer>`;

const TRAVELS = `<EntityType Name="Travel"><Key><PropertyRef Name="ID"/><PropertyRef Name="IsActiveEntity"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="IsActiveEntity" Type="Edm.Boolean" Nullable="false"/>
<Property Name="Title" Type="Edm.String" MaxLength="60"/></EntityType>
<EntityContainer Name="C"><EntitySet Name="Travels" EntityType="Demo.Travel"/></EntityContainer>`;

describe('generating again from rows the caller kept', () => {
    it('reports date-order violations of supplied and generated rows together instead of failing', async () => {
        // Given a supplied price row whose validity ends before it starts, and generated rows that do the same
        const reversed = { Material: 'M-1', ValidityStartDate: '2025-01-01', ValidityEndDate: '2024-01-01', Amount: 1 };

        // When more rows are generated for the entity set
        const result = await generateService(request(PRICES, 'Prices', [reversed]), {
            mode: 'deterministic',
            seed: 1,
            rowsPerEntity: 3
        });

        // Then the rows publish, the supplied row first, with the violation reported
        expect(result.resources.Prices[0]).toEqual(reversed);
        expect(result.diagnostics.map(({ code }) => code)).toContain('TEMPORAL_CONSTRAINT_VIOLATION');
    });

    it('accepts a generated result fed back as supplied rows', async () => {
        // Given the rows of a first generation, kept by the caller
        const first = await generateService(request(PRICES, 'Prices'), {
            mode: 'deterministic',
            seed: 1,
            rowsPerEntity: 4
        });

        // When the entity set is generated again with those rows supplied
        const second = await generateService(request(PRICES, 'Prices', first.resources.Prices), {
            mode: 'deterministic',
            seed: 1,
            rowsPerEntity: 2
        });

        // Then the kept rows lead the result as written
        expect(second.resources.Prices.slice(0, 4)).toEqual(first.resources.Prices);
    });

    it.each([
        ['left out', { ID: 1, Title: 'Lisbon' }],
        ['null', { ID: 1, IsActiveEntity: null, Title: 'Lisbon' }],
        ['empty', { ID: 1, IsActiveEntity: '', Title: 'Lisbon' }]
    ])('publishes a supplied row whose key part is %s once', async (_label, row) => {
        // Given a hand-written draft row without a usable IsActiveEntity
        const serviceRequest = request(TRAVELS, 'Travels', [row]);

        // When the entity set is generated
        const result = await generateService(serviceRequest, { mode: 'deterministic', seed: 1, rowsPerEntity: 3 });

        // Then the supplied row leads the result exactly once
        expect(result.resources.Travels[0]).toEqual(row);
        expect(
            result.resources.Travels.filter((published) => published.Title === 'Lisbon' && published.ID === 1)
        ).toHaveLength(1);
    });
});
