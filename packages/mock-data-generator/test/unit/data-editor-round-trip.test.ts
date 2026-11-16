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

const ORDERS_WITH_ITEM_COUNTS = `<EntityType Name="Order"><Key><PropertyRef Name="OrderID"/></Key>
<Property Name="OrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
<Property Name="Description" Type="Edm.String" MaxLength="40"/>
<Property Name="ItemCount" Type="Edm.Int32"/>
<Property Name="HasItems" Type="Edm.Boolean"/></EntityType>
<EntityType Name="OrderItem"><Key><PropertyRef Name="OrderID"/><PropertyRef Name="ItemNo"/></Key>
<Property Name="OrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
<Property Name="ItemNo" Type="Edm.String" Nullable="false" MaxLength="6"/>
<Property Name="Product" Type="Edm.String" MaxLength="40"/>
<Property Name="Quantity" Type="Edm.Int32"/></EntityType>
<EntityContainer Name="C"><EntitySet Name="Orders" EntityType="Demo.Order"/><EntitySet Name="OrderItems" EntityType="Demo.OrderItem"/></EntityContainer>`;

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

    it('leaves supplied child rows to themselves when it links child rows to parents it infers', async () => {
        // Given supplied order items, and orders whose item counts make the generator infer the item-to-order link
        const items = [
            { OrderID: 'MY-ORDER-1', ItemNo: '000010', Product: 'Hand-written product A', Quantity: 111 },
            { OrderID: 'MY-ORDER-1', ItemNo: '000020', Product: 'Hand-written product B', Quantity: 222 }
        ];
        const serviceRequest: MockDataServiceRequest = {
            ...request(ORDERS_WITH_ITEM_COUNTS, 'Orders'),
            targets: [
                { name: 'Orders', kind: 'entity-set' },
                { name: 'OrderItems', kind: 'entity-set' }
            ],
            existingData: { OrderItems: supplied(items) }
        };

        // When both entity sets are generated
        const result = await generateService(serviceRequest, { mode: 'deterministic', seed: 1, rowsPerEntity: 6 });

        // Then the supplied items lead as written, and no generated item copies their content
        const published = result.resources.OrderItems;
        expect(published.slice(0, 2)).toEqual(items);
        const generatedItems = published.slice(2);
        expect(generatedItems.length).toBeGreaterThan(0);
        expect(generatedItems.filter(({ Product }) => String(Product).startsWith('Hand-written'))).toEqual([]);
    });
});
