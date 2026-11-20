import { generateServiceForTesting } from '../../src/index.js';
import type {
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest,
    SemanticClassification
} from '../../src/types.js';

/**
 * A one-entity OData V4 service.
 *
 * @param properties property elements after the `ID` key
 * @returns the generation request
 */
function service(properties: string): MockDataServiceRequest {
    return {
        metadata: {
            format: 'edmx',
            content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Record"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
${properties}
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Records" EntityType="Demo.Record"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`
        },
        service: { urlPath: '/timeline', odataVersion: '4.0' },
        targets: [{ name: 'Records', kind: 'entity-set' }],
        existingData: {}
    };
}

/**
 * A classifier that routes properties by name to fixed roles and abstains on the rest.
 *
 * @param roles role per property name
 * @returns the runtime
 */
function routing(roles: Readonly<Record<string, string>>): MockDataGeneratorRuntime {
    return {
        classifier: {
            fingerprint: 'row-timeline-test',
            classify: async (input): Promise<SemanticClassification> =>
                roles[input.propertyName]
                    ? { role: roles[input.propertyName], confidence: 1, source: 'classifier' }
                    : { role: 'unknown', confidence: 1, source: 'unknown', top: [{ role: 'unknown', confidence: 1 }] }
        }
    };
}

/**
 * Generate the records with the date fields routed to the given roles.
 *
 * @param properties property elements after the `ID` key
 * @param roles role per property name
 * @returns the rows
 */
async function records(
    properties: string,
    roles: Readonly<Record<string, string>>
): Promise<ReadonlyArray<MockDataRow>> {
    const result = await generateServiceForTesting(service(properties), { seed: 4, rowsPerEntity: 40 }, routing(roles));
    return result.resources.Records;
}

describe('one timeline per row', () => {
    it('changes a record after it was created in most rows, never before', async () => {
        // Given a creation and a change timestamp
        const rows = await records(
            `<Property Name="CreatedAt" Type="Edm.DateTimeOffset"/>
<Property Name="ChangedAt" Type="Edm.DateTimeOffset"/>`,
            { CreatedAt: 'datetime', ChangedAt: 'datetime' }
        );

        // Then the change never precedes the creation and follows it in most rows
        const pairs = rows.map((row) => [Date.parse(String(row.CreatedAt)), Date.parse(String(row.ChangedAt))]);
        expect(pairs.every(([created, changed]) => changed >= created)).toBe(true);
        expect(pairs.filter(([created, changed]) => changed > created).length).toBeGreaterThan(rows.length / 2);
    });

    it('pairs a creation and a change whose names differ only in their clock words', async () => {
        // Given a creation time and a change instant
        const rows = await records(
            `<Property Name="creationTime" Type="Edm.DateTimeOffset"/>
<Property Name="modifiedAt" Type="Edm.DateTimeOffset"/>`,
            { creationTime: 'datetime', modifiedAt: 'datetime' }
        );

        // Then the change follows the creation in most rows
        const later = rows.filter((row) => Date.parse(String(row.modifiedAt)) > Date.parse(String(row.creationTime)));
        expect(later.length).toBeGreaterThan(rows.length / 2);
    });

    it('orders a creation and a change by their names when both carry the same generic label', async () => {
        // Given a creation, a change, a start and an end timestamp all labelled "Time Stamp"
        const label = '<Annotation Term="Common.Label" String="Time Stamp"/>';
        const rows = await records(
            `<Property Name="CreatedAt" Type="Edm.DateTimeOffset">${label}</Property>
<Property Name="ChangedAt" Type="Edm.DateTimeOffset">${label}</Property>
<Property Name="ValidFrom" Type="Edm.DateTimeOffset">${label}</Property>
<Property Name="ValidTo" Type="Edm.DateTimeOffset">${label}</Property>`,
            { CreatedAt: 'datetime', ChangedAt: 'datetime', ValidFrom: 'datetime', ValidTo: 'datetime' }
        );

        // Then each later event never precedes its earlier one
        const at = (row: MockDataRow, name: string): number => Date.parse(String(row[name]));
        expect(rows.every((row) => at(row, 'ChangedAt') >= at(row, 'CreatedAt'))).toBe(true);
        expect(rows.every((row) => at(row, 'ValidTo') >= at(row, 'ValidFrom'))).toBe(true);
        expect(rows.filter((row) => at(row, 'ChangedAt') > at(row, 'CreatedAt')).length).toBeGreaterThan(
            rows.length / 2
        );
    });

    it('ends an event later on its day in most rows, never before it starts', async () => {
        // Given a start and an end time
        const rows = await records(
            `<Property Name="StartTime" Type="Edm.TimeOfDay"/>
<Property Name="EndTime" Type="Edm.TimeOfDay"/>`,
            { StartTime: 'time', EndTime: 'time' }
        );

        // Then the end never precedes the start and follows it in most rows
        const pairs = rows.map((row) => [String(row.StartTime), String(row.EndTime)]);
        expect(pairs.every(([start, end]) => end >= start)).toBe(true);
        expect(pairs.filter(([start, end]) => end > start).length).toBeGreaterThan(rows.length / 2);
    });

    it('gives timestamps a time of day', async () => {
        // Given a timestamp
        const rows = await records(`<Property Name="PostedAt" Type="Edm.DateTimeOffset"/>`, { PostedAt: 'datetime' });

        // Then not every value is midnight, and the times differ between rows
        const times = rows.map((row) => String(row.PostedAt).slice(11, 19));
        expect(times.every((time) => time === '00:00:00')).toBe(false);
        expect(new Set(times).size).toBeGreaterThan(rows.length / 2);
    });

    it('keeps the date and the time of an event equal to its timestamp', async () => {
        // Given a creation timestamp and its separate date and time
        const rows = await records(
            `<Property Name="CreationDateTime" Type="Edm.DateTimeOffset"/>
<Property Name="CreationDate" Type="Edm.Date"/>
<Property Name="CreationTime" Type="Edm.TimeOfDay"/>`,
            { CreationDateTime: 'datetime', CreationDate: 'date', CreationTime: 'time' }
        );

        // Then each row's date and time are those of its timestamp
        for (const row of rows) {
            const timestamp = String(row.CreationDateTime);
            expect(row.CreationDate).toBe(timestamp.slice(0, 10));
            expect(String(row.CreationTime).slice(0, 8)).toBe(timestamp.slice(11, 19));
        }
    });

    /**
     * Orders and items whose items reference their order, keyed by the order and an item number or by their
     * own ID only.
     *
     * @param keyedByOrder whether the item key includes the order
     * @returns the generation request
     */
    function ordersAndItems(keyedByOrder: boolean): MockDataServiceRequest {
        const itemKey = keyedByOrder
            ? '<Key><PropertyRef Name="OrderID"/><PropertyRef Name="ID"/></Key>'
            : '<Key><PropertyRef Name="ID"/></Key>';
        return {
            metadata: {
                format: 'edmx',
                content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Order"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="CreatedAt" Type="Edm.DateTimeOffset"/>
</EntityType>
<EntityType Name="Item">${itemKey}
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="OrderID" Type="Edm.Int32" Nullable="false"/>
<Property Name="CreatedAt" Type="Edm.DateTimeOffset"/>
<Property Name="ChangedAt" Type="Edm.DateTimeOffset"/>
<NavigationProperty Name="to_Order" Type="Demo.Order" Nullable="false"><ReferentialConstraint Property="OrderID" ReferencedProperty="ID"/></NavigationProperty>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Orders" EntityType="Demo.Order"/>
<EntitySet Name="Items" EntityType="Demo.Item"><NavigationPropertyBinding Path="to_Order" Target="Orders"/></EntitySet></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`
            },
            service: { urlPath: '/timeline', odataVersion: '4.0' },
            targets: [
                { name: 'Orders', kind: 'entity-set' },
                { name: 'Items', kind: 'entity-set' }
            ],
            existingData: {}
        };
    }

    it('creates a record keyed by its parent no earlier than the parent', async () => {
        // Given items keyed by their order and an item number, both with a creation timestamp
        const request = ordersAndItems(true);

        // When the service is generated
        const result = await generateServiceForTesting(
            request,
            { seed: 4, rowsPerEntity: 30 },
            routing({ CreatedAt: 'datetime', ChangedAt: 'datetime' })
        );

        // Then every item is created at or after its order and changed at or after its creation
        const orders = new Map(result.resources.Orders.map((order) => [order.ID, Date.parse(String(order.CreatedAt))]));
        const items = result.resources.Items.filter((item) => orders.has(item.OrderID));
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(Date.parse(String(item.CreatedAt))).toBeGreaterThanOrEqual(orders.get(item.OrderID) ?? Infinity);
            expect(Date.parse(String(item.ChangedAt))).toBeGreaterThanOrEqual(Date.parse(String(item.CreatedAt)));
        }
        // And the assumption is reported
        expect(
            result.diagnostics.some(
                ({ code, target }) => code === 'SYNTHETIC_TEMPORAL_ASSUMPTION' && target === 'Items'
            )
        ).toBe(true);
    });

    it('does not order the creation of records a plain reference links', async () => {
        // Given items that only reference their order
        const request = ordersAndItems(false);

        // When the service is generated
        const result = await generateServiceForTesting(
            request,
            { seed: 4, rowsPerEntity: 30 },
            routing({ CreatedAt: 'datetime', ChangedAt: 'datetime' })
        );

        // Then a reference alone does not move an item after its order: some item is created first
        const orders = new Map(result.resources.Orders.map((order) => [order.ID, Date.parse(String(order.CreatedAt))]));
        const earlier = result.resources.Items.filter(
            (item) => Date.parse(String(item.CreatedAt)) < (orders.get(item.OrderID) ?? -Infinity)
        );
        expect(earlier.length).toBeGreaterThan(0);
    });
});
