import assert from 'node:assert/strict';
import { test } from 'node:test';
import { joinReviewedRole } from './lib/reviewed-role-join.mjs';

const graph = {
    namespace: 'Demo',
    entities: [
        {
            name: 'Booking',
            entitySetName: 'Bookings',
            properties: [
                {
                    name: 'BookingStatus',
                    primitiveType: 'string',
                    nullable: false,
                    isKey: false,
                    maxLength: 2,
                    label: 'Booking Status',
                    annotations: [],
                    links: { text: 'BookingStatusText' }
                },
                {
                    name: 'BookingStatusText',
                    primitiveType: 'string',
                    nullable: true,
                    isKey: false,
                    annotations: []
                }
            ]
        }
    ],
    relationships: []
};

const review = {
    source_service: 'review-source-1',
    entity_type_name: 'Booking',
    property_name: 'BookingStatus',
    label: 'Booking Status',
    hint: 'status'
};

const binding = {
    serviceId: 'verified-service-1',
    reviewSourceService: 'review-source-1',
    sourceChecksum: 'a'.repeat(64),
    graph,
    reviewKind: 'model-panel-agreement',
    permission: { permittedUses: ['evaluation'], derivativeTrainingAllowed: false }
};

test('joins a reviewed semantic hint to the actual v3 schema context, not the UI label', () => {
    const row = joinReviewedRole({ review, binding, purpose: 'evaluation' });
    assert.equal(row.label, 'status');
    assert.equal(row.group, 'verified-service-1');
    assert.equal(row.context.inputFormat, 'v3');
    assert.equal(row.context.propertyName, 'BookingStatus');
    assert.equal(row.context.facets.maxLength, 2);
    assert.deepEqual(row.context.linkedMetadataPaths, ['BookingStatusText']);
    assert.deepEqual(row.context.neighbors, ['BookingStatusText']);
    assert.equal(row.reviewKind, 'model-panel-agreement');
});

test('does not train on an evaluation-only review pack', () => {
    assert.throws(
        () => joinReviewedRole({ review, binding, purpose: 'train' }),
        /derivative training is not permitted/u
    );
    assert.throws(
        () =>
            joinReviewedRole({
                review,
                binding: {
                    ...binding,
                    permission: { ...binding.permission, derivativeTrainingAllowed: true }
                },
                purpose: 'train'
            }),
        /training use is not permitted/u
    );
});

test('rejects unresolved decisions and source mismatches', () => {
    assert.throws(
        () => joinReviewedRole({ review: { ...review, hint: 'REVIEW_ME' }, binding, purpose: 'evaluation' }),
        /unresolved review/u
    );
    assert.throws(
        () =>
            joinReviewedRole({
                review: { ...review, source_service: 'other-source' },
                binding,
                purpose: 'evaluation'
            }),
        /source service mismatch/u
    );
});

test('does not invent a v3 context when the reviewed property is absent or ambiguous', () => {
    assert.throws(
        () =>
            joinReviewedRole({
                review: { ...review, property_name: 'Missing' },
                binding,
                purpose: 'evaluation'
            }),
        /exactly one schema property/u
    );
    assert.throws(
        () =>
            joinReviewedRole({
                review,
                binding: { ...binding, graph: { ...graph, entities: [...graph.entities, graph.entities[0]] } },
                purpose: 'evaluation'
            }),
        /exactly one schema entity/u
    );
});

test('uses an explicit review-to-schema entity binding without suffix guessing', () => {
    const prefixedGraph = {
        ...graph,
        entities: [{ ...graph.entities[0], name: 'demo_Booking', entitySetName: 'demo_Bookings' }]
    };
    const mapped = joinReviewedRole({
        review,
        binding: {
            ...binding,
            graph: prefixedGraph,
            reviewEntityName: 'Booking',
            schemaEntitySet: 'demo_Bookings'
        },
        purpose: 'evaluation'
    });
    assert.equal(mapped.context.entityName, 'demo_Booking');
    assert.equal(mapped.id, 'verified-service-1/demo_Bookings/BookingStatus');
    assert.throws(
        () => joinReviewedRole({ review, binding: { ...binding, graph: prefixedGraph }, purpose: 'evaluation' }),
        /exactly one schema entity/u
    );
    assert.throws(
        () =>
            joinReviewedRole({
                review,
                binding: {
                    ...binding,
                    graph: prefixedGraph,
                    reviewEntityName: 'Other',
                    schemaEntitySet: 'demo_Bookings'
                },
                purpose: 'evaluation'
            }),
        /review entity binding mismatch/u
    );
});
