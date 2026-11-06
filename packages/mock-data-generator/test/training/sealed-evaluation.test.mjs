import {
    createFieldContextV3,
    parseEdmx,
    roleRegistryContract,
    serializeFieldContextV3
} from '../../training/common/runtime.mjs';
import {
    routeSealedService,
    sealedDatasetFingerprint,
    summarizeSealedDecisions
} from '../../training/role-head/sealed-evaluation.mjs';
import { buildSealedServices, sealedServiceEdmx } from '../../training/role-head/sealed-graph.mjs';

const edmx = `<?xml version="1.0"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices>
<Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="S">
<EntityType Name="Ticket"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="LifecycleCode" Type="Edm.String" MaxLength="2"/>
<Property Name="ContactMail" Type="Edm.String" MaxLength="80"/>
<Property Name="Note" Type="Edm.String" MaxLength="80"/>
</EntityType>
<EntityContainer Name="C"><EntitySet Name="Tickets" EntityType="S.Ticket"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const graph = parseEdmx(edmx);
const entity = graph.entities[0];
const { roles } = roleRegistryContract();
const row = (name, label, serviceId = 'svc-a', domain = 'service') => ({
    id: `property:${serviceId}/Tickets/${name}`,
    serviceId,
    domain,
    label,
    context: createFieldContextV3(
        graph,
        entity,
        entity.properties.find((property) => property.name === name)
    )
});
const stubClassifier = (assigned) => ({
    fingerprint: 'f'.repeat(64),
    inputFormat: 'v3',
    async classify(input) {
        const role = assigned[input.propertyName] ?? 'unknown';
        return {
            role,
            confidence: role === 'unknown' ? 0.99 : 0.97,
            source: role === 'unknown' ? 'unknown' : 'classifier',
            routeThreshold: 0.5
        };
    }
});

describe('sealed evaluation', () => {
    test('routes sealed fields through runtime arbitration and derives gate fields', async () => {
        // Given a service with a status, an email and an unknown field
        const rows = [row('LifecycleCode', 'status'), row('ContactMail', 'email'), row('Note', 'unknown')];
        // When a classifier routes them (Note wrongly as city)
        const decisions = await routeSealedService({
            graph,
            rows,
            classifier: stubClassifier({ LifecycleCode: 'status', ContactMail: 'email', Note: 'city' })
        });
        const summary = summarizeSealedDecisions({
            decisions,
            claimedLabels: ['status', 'email', 'city'],
            registryRoles: roles
        });
        // Then the status field counts as unannotated status, and three fields fail the sample-size rule
        const byRole = Object.fromEntries(summary.fields.map((field) => [field.expectedRole, field]));
        expect(byRole.status.unannotatedStatus).toBe(true);
        expect(summary.sealedEvaluation.unannotatedStatusFields.total).toBe(1);
        expect(summary.sealedEvaluation.services).toBe(1);
        expect(summary.sealedEvaluation.acceptedRoles.total).toBeGreaterThanOrEqual(1);
        expect(byRole.unknown.criticalFalsePositive).toBe(byRole.unknown.acceptedRole === 'city');
        expect(summary.gate.pass).toBe(false);
    });

    test('policy-forbidden expected roles leave the recall denominators but stay in the table', async () => {
        // Given the ID key labelled status, which the status role forbids
        const rows = [row('ID', 'status'), row('LifecycleCode', 'status'), row('Note', 'unknown')];
        // When routed
        const decisions = await routeSealedService({
            graph,
            rows,
            classifier: stubClassifier({ LifecycleCode: 'status' })
        });
        const summary = summarizeSealedDecisions({ decisions, claimedLabels: ['status'], registryRoles: roles });
        // Then the key is policy-excluded and only the code field counts
        const key = summary.fields.find((field) => field.id.endsWith('/ID'));
        expect(key).toMatchObject({
            policyExcluded: true,
            expectedPolicy: 'key-policy',
            unannotatedStatus: false,
            supported: false
        });
        expect(summary.sealedEvaluation.unannotatedStatusFields.total).toBe(1);
        expect(summary.fields).toHaveLength(3);
    });

    test('fingerprint is order-independent and label-sensitive', () => {
        // Given two sealed rows
        const rows = [row('LifecycleCode', 'status'), row('ContactMail', 'email')];
        // Then reordering keeps the fingerprint and relabelling changes it
        expect(sealedDatasetFingerprint([...rows].reverse())).toBe(sealedDatasetFingerprint(rows));
        expect(sealedDatasetFingerprint([row('LifecycleCode', 'unknown'), rows[1]])).not.toBe(
            sealedDatasetFingerprint(rows)
        );
    });

    test('missing sealed fields fail the summary', () => {
        // Given a decision whose field was not found, then the summary refuses
        expect(() =>
            summarizeSealedDecisions({
                decisions: [{ row: row('Note', 'unknown'), missing: true }],
                claimedLabels: [],
                registryRoles: roles
            })
        ).toThrow(/could not be located/u);
    });
});

describe('sealed graph reconstruction', () => {
    const fieldContext = (property, extra = {}) => ({
        field_id: `property:svc-1/Orders/${property}`,
        entity_type: 'Orders',
        property,
        primitive_type: 'string',
        facets: { maxLength: 10, nullable: true },
        neighbors: ['OrderId', 'Status'],
        annotations_summary: { terms: ['Common.Label', 'UI.Hidden'] },
        ...extra
    });

    test('rebuilds a service whose fields serialize to their published text', () => {
        // Given a published sealed field whose label needs XML escaping
        const record = fieldContext('Status');
        const published = parseEdmx(
            sealedServiceEdmx([
                {
                    context: {
                        entityName: 'Orders',
                        propertyName: 'Status',
                        primitiveType: 'string',
                        nullable: true,
                        isKey: false,
                        facets: { maxLength: 10 },
                        label: 'Status <A&B>'
                    },
                    terms: []
                }
            ])
        );
        const [orders] = published.entities;
        const text = serializeFieldContextV3(createFieldContextV3(published, orders, orders.properties[0]));
        // When its service is rebuilt from the dataset records
        const [service] = buildSealedServices({
            sealedRows: [{ field_id: record.field_id, service_id: 'svc-1', label: 'status', text }],
            fieldContexts: new Map([[record.field_id, record]]),
            labels: new Map([[record.field_id, { domain: 'sales' }]])
        });
        // Then the service carries the row with its domain, terms and a graph that round-trips
        expect(service.serviceId).toBe('svc-1');
        expect(service.rows[0]).toMatchObject({
            domain: 'sales',
            label: 'status',
            terms: ['Common.Label', 'UI.Hidden']
        });
        expect(service.rows[0].context.label).toBe('Status <A&B>');
    });

    test('emits term-only annotations without the valued label terms', () => {
        // Given a field with a label and two published terms
        const xml = sealedServiceEdmx([
            {
                context: {
                    entityName: 'E',
                    propertyName: 'P',
                    primitiveType: 'int',
                    nullable: true,
                    isKey: false,
                    facets: {},
                    label: 'L'
                },
                terms: ['Common.Label', 'UI.Hidden']
            }
        ]);
        // Then the label is written once with its value and the other term has no value
        expect(xml).toContain('<Annotation Term="Common.Label" String="L"/>');
        expect(xml).toContain('<Annotation Term="UI.Hidden"/>');
        expect(xml.match(/Common\.Label/gu)).toHaveLength(1);
    });

    test('refuses unsupported types and fields without a domain', () => {
        // Given an unsupported primitive type, then the EDMX builder refuses
        expect(() =>
            sealedServiceEdmx([
                { context: { entityName: 'E', propertyName: 'P', primitiveType: 'stream', facets: {} }, terms: [] }
            ])
        ).toThrow(/unsupported type/u);
        // Given a sealed row with no labels record, then the service builder refuses
        const record = fieldContext('Status');
        expect(() =>
            buildSealedServices({
                sealedRows: [{ field_id: record.field_id, service_id: 'svc-1', label: 'status', text: 'x' }],
                fieldContexts: new Map([[record.field_id, record]]),
                labels: new Map()
            })
        ).toThrow(/cannot be rebuilt/u);
    });
});
