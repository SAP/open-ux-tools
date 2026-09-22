import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trainRelevanceHead, evaluateRelevanceHead } from './lib/relevance-train.mjs';

const sha = (character) => character.repeat(64);

function row(id, serviceGroup, relevant, value) {
    return {
        id,
        serviceGroup,
        reviewed: true,
        relevant,
        ...(relevant ? {} : { negativeKind: 'cross-domain' }),
        pair: {
            service: { urlPath: `/${serviceGroup}`, odataVersion: '4.0' },
            resource: 'CodeSet',
            entity: 'Code',
            field: { name: 'Meaning', primitiveType: 'string', isKey: false, nullable: false },
            value,
            linkedCode: { property: 'Code', value: id },
            textLink: { codeProperty: 'Code', textProperty: 'Meaning' },
            relatedResources: ['Records']
        }
    };
}

const rows = [
    row('t-positive', 'training-service', true, 'relevant train'),
    row('t-negative', 'training-service', false, 'irrelevant train'),
    row('c-positive', 'calibration-service', true, 'relevant calibration'),
    row('c-negative', 'calibration-service', false, 'irrelevant calibration'),
    row('s-positive', 'sealed-service', true, 'relevant sealed'),
    row('s-negative', 'sealed-service', false, 'irrelevant sealed')
];

const embedder = {
    embed: async (texts) => texts.map((text) => (text.includes('irrelevant') ? [-1, 0] : [1, 0]))
};

function input() {
    return {
        rows,
        trainIds: ['t-positive', 't-negative'],
        calibrationIds: ['c-positive', 'c-negative'],
        sealedIds: ['s-positive', 's-negative'],
        encoderSha256: sha('a'),
        vocabularySha256: sha('b'),
        embedder
    };
}

test('trains an unqualified head from reviewed service-disjoint pairs and evaluates sealed rows separately', async () => {
    const { head, calibration } = await trainRelevanceHead(input());
    assert.equal(head.qualification.status, 'unqualified');
    assert.equal(head.maxWordPieceTokens, 64);
    assert.equal(head.encoderSha256, sha('a'));
    assert.equal(head.tokenizerSha256, sha('b'));
    assert.equal(head.dim, 2);
    assert.equal(calibration.total, 2);
    const sealed = await evaluateRelevanceHead({ head, rows: rows.slice(4), embedder });
    assert.equal(sealed.total, 2);
    assert.equal(sealed.positiveAcceptance, 1);
    assert.equal(sealed.hardNegativeAcceptance, 0);
});

test('rejects service leakage, unreviewed pairs and missing cross-domain hard negatives', async () => {
    await assert.rejects(
        trainRelevanceHead({ ...input(), calibrationIds: ['t-positive', 't-negative'] }),
        /overlap|disjoint/i
    );
    await assert.rejects(
        trainRelevanceHead({
            ...input(),
            rows: rows.map((candidate, index) => (index === 0 ? { ...candidate, reviewed: false } : candidate))
        }),
        /reviewed/
    );
    await assert.rejects(
        trainRelevanceHead({
            ...input(),
            rows: rows.map((candidate, index) => (index === 1 ? { ...candidate, negativeKind: 'random' } : candidate))
        }),
        /cross-domain/
    );
});

test('rejects sealed rows inside training or calibration before allocating embeddings', async () => {
    let called = false;
    await assert.rejects(
        trainRelevanceHead({
            ...input(),
            trainIds: ['t-positive', 's-negative'],
            embedder: {
                embed: async () => {
                    called = true;
                    return [];
                }
            }
        }),
        /overlap|disjoint/
    );
    assert.equal(called, false);
});

test('rejects source-service aliases and contradictory duplicate pairs across partitions', async () => {
    const aliased = rows.map((candidate, index) =>
        index === 2 || index === 3
            ? {
                  ...candidate,
                  pair: { ...candidate.pair, service: { ...candidate.pair.service, urlPath: '/training-service' } }
              }
            : candidate
    );
    await assert.rejects(trainRelevanceHead({ ...input(), rows: aliased }), /service-disjoint/);
    const contradictory = rows.map((candidate, index) =>
        index === 1 ? { ...candidate, pair: rows[0].pair } : candidate
    );
    await assert.rejects(trainRelevanceHead({ ...input(), rows: contradictory }), /duplicate.*pair|repeats.*pair/);
});
