import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    collectFieldValues,
    resolveValueField,
    reviewedRelevanceRecords,
    sampleRelevanceCandidates
} from './lib/relevance-review-set.mjs';

const graph = (entitySetName, names) => ({
    entities: [
        {
            name: 'Item',
            entitySetName,
            properties: [
                { name: 'ID', primitiveType: 'int', isKey: true },
                ...names.map((name) => ({ name, primitiveType: 'string', nullable: true, label: name }))
            ]
        }
    ]
});
const rows = (prefix, count, field) =>
    Array.from({ length: count }, (_, index) => ({
        entityId: 'entity:S/Item',
        values: { 'property:S/Item/ID': index + 1, [`property:S/Item/${field}`]: `${prefix}-${index}` }
    }));

test('resolves schema-graph and CAP style field ids uniquely', () => {
    const g = graph('entity:S/Item', ['Title']);
    assert.equal(resolveValueField(g, 'entity:S/Item', 'property:S/Item/Title').property.name, 'Title');
    assert.equal(resolveValueField(g, 'entity:S/Other', 'property:S/Other/Title'), undefined);
});

test('samples observed positives and cross-group negatives without self-donation', () => {
    const owner = collectFieldValues({
        serviceGroup: 'owner',
        graph: graph('entity:S/Item', ['Title']),
        rows: rows('own', 10, 'Title')
    });
    const donor = collectFieldValues({
        serviceGroup: 'donor',
        graph: graph('entity:S/Item', ['Name']),
        rows: rows('don', 10, 'Name')
    });
    const all = new Map([...owner, ...[...donor].map(([key, value]) => [`d:${key}`, value])]);
    const candidates = sampleRelevanceCandidates({
        partition: 'train',
        ownerFields: owner,
        donorFields: all,
        positives: 4,
        negatives: 6,
        seed: 's'
    });
    assert.equal(candidates.filter((candidate) => candidate.origin === 'observed').length, 4);
    const negatives = candidates.filter((candidate) => candidate.origin === 'cross-domain');
    assert.equal(negatives.length, 6);
    assert.ok(
        negatives.every((candidate) => candidate.donorGroup === 'donor' && candidate.pair.value.startsWith('don-'))
    );
    assert.equal(new Set(candidates.map((candidate) => candidate.id)).size, candidates.length);
    assert.equal(candidates[0].pair.linkedCode.property, 'ID');
    const consensus = new Map(
        candidates.map((candidate, index) => [
            candidate.id,
            { relevant: candidate.origin === 'observed' ? index !== 0 : index === 9 }
        ])
    );
    const { records, dropped } = reviewedRelevanceRecords(candidates, consensus);
    assert.equal(dropped['observed-pair-judged-irrelevant'], 1);
    assert.ok(records.filter((record) => !record.relevant).every((record) => record.negativeKind === 'cross-domain'));
    assert.ok(
        records.some(
            (record) =>
                record.relevant && candidates.find((candidate) => candidate.id === record.id).origin === 'cross-domain'
        )
    );
});
