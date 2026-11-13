import { relevanceRowsFromDataset } from '../../training/relevance-head/relevance-dataset.mjs';
import { evaluateRelevanceHead, trainRelevanceHead } from '../../training/relevance-head/relevance-train.mjs';

const sha = (character) => character.repeat(64);
const row = (id, serviceGroup, relevant, value) => ({
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
});
const rows = [
    row('t-positive', 'training-service', true, 'relevant train'),
    row('t-negative', 'training-service', false, 'irrelevant train'),
    row('c-positive', 'calibration-service', true, 'relevant calibration'),
    row('c-negative', 'calibration-service', false, 'irrelevant calibration'),
    row('s-positive', 'sealed-service', true, 'relevant sealed'),
    row('s-negative', 'sealed-service', false, 'irrelevant sealed')
];
const embedder = { embed: async (texts) => texts.map((text) => (text.includes('irrelevant') ? [-1, 0] : [1, 0])) };
const input = () => ({
    rows,
    trainIds: ['t-positive', 't-negative'],
    calibrationIds: ['c-positive', 'c-negative'],
    sealedIds: ['s-positive', 's-negative'],
    encoderSha256: sha('a'),
    vocabularySha256: sha('b'),
    embedder
});

describe('trainRelevanceHead', () => {
    test('trains an unqualified head and evaluates sealed rows separately', async () => {
        // Given separable reviewed pairs in three service-disjoint partitions
        // When trained and evaluated on the sealed rows
        const { head, calibration } = await trainRelevanceHead(input());
        const sealed = await evaluateRelevanceHead({ head, rows: rows.slice(4), embedder });
        // Then the head pins its encoder contract and separates the sealed rows
        expect(head).toMatchObject({
            dim: 2,
            maxWordPieceTokens: 64,
            encoderSha256: sha('a'),
            tokenizerSha256: sha('b')
        });
        expect(head.qualification.status).toBe('unqualified');
        expect(head.qualification.sealedIds).toEqual(['s-positive', 's-negative']);
        expect(calibration.total).toBe(2);
        expect(sealed).toMatchObject({ total: 2, positiveAcceptance: 1, hardNegativeAcceptance: 0 });
    });

    test('rejects service leakage, unreviewed pairs and non-cross-domain negatives', async () => {
        // Given each broken input, then training refuses
        await expect(trainRelevanceHead({ ...input(), calibrationIds: ['t-positive', 't-negative'] })).rejects.toThrow(
            /overlap|disjoint/iu
        );
        const unreviewed = rows.map((candidate, index) =>
            index === 0 ? { ...candidate, reviewed: false } : candidate
        );
        await expect(trainRelevanceHead({ ...input(), rows: unreviewed })).rejects.toThrow(/reviewed/u);
        const random = rows.map((candidate, index) =>
            index === 1 ? { ...candidate, negativeKind: 'random' } : candidate
        );
        await expect(trainRelevanceHead({ ...input(), rows: random })).rejects.toThrow(/cross-domain/u);
        await expect(trainRelevanceHead({ ...input(), fit: { epochs: 0 } })).rejects.toThrow(/fit configuration/u);
    });

    test('rejects sealed rows inside training before embedding anything', async () => {
        // Given a sealed row in train and an embedder that records calls
        let called = false;
        const recording = { embed: async () => ((called = true), []) };
        // Then training refuses and never embeds
        await expect(
            trainRelevanceHead({ ...input(), trainIds: ['t-positive', 's-negative'], embedder: recording })
        ).rejects.toThrow(/overlap|disjoint/u);
        expect(called).toBe(false);
    });

    test('rejects service aliases and duplicate pairs across partitions', async () => {
        // Given calibration rows that point at the training service path
        const aliased = rows.map((candidate, index) =>
            index === 2 || index === 3
                ? {
                      ...candidate,
                      pair: { ...candidate.pair, service: { ...candidate.pair.service, urlPath: '/training-service' } }
                  }
                : candidate
        );
        await expect(trainRelevanceHead({ ...input(), rows: aliased })).rejects.toThrow(/service-disjoint/u);
        // Given one pair labelled both ways
        const contradictory = rows.map((candidate, index) =>
            index === 1 ? { ...candidate, pair: rows[0].pair } : candidate
        );
        await expect(trainRelevanceHead({ ...input(), rows: contradictory })).rejects.toThrow(
            /duplicate.*pair|repeats.*pair/u
        );
    });
});

describe('relevanceRowsFromDataset', () => {
    const record = (pairId, split, relevant) => ({
        pair_id: pairId,
        service_group: 'grp-1',
        split,
        reviewed: true,
        relevant,
        resource: 'Codes',
        entity: 'Code',
        field: { name: 'Text', primitiveType: 'string', nullable: false, label: 'Text', maxLength: 40 },
        value: 'Open',
        linked_code: { property: 'Code', value: 'O' },
        text_link: { codeProperty: 'Code', textProperty: 'Text' }
    });

    test('maps published pairs to reviewed rows and split id lists', () => {
        // Given a positive train pair and a negative sealed pair
        const { rows: mapped, partitions } = relevanceRowsFromDataset([
            record('p1', 'train', true),
            record('p2', 'sealed', false)
        ]);
        // Then the rows carry the runtime pair shape and the negative is a cross-domain hard negative
        expect(mapped[0].pair.service).toEqual({ alias: 'grp-1', urlPath: '/grp-1', odataVersion: '4.0' });
        expect(Object.keys(mapped[0].pair.field)).toEqual(['name', 'primitiveType', 'nullable', 'label', 'maxLength']);
        expect(mapped[0].pair.relatedResources).toEqual([]);
        expect(mapped[0]).not.toHaveProperty('negativeKind');
        expect(mapped[1].negativeKind).toBe('cross-domain');
        expect(partitions).toEqual({ train: ['p1'], calibration: [], sealed: ['p2'] });
    });

    test('refuses an unknown split', () => {
        // Given a record outside train/calibration/sealed, then the adapter refuses
        expect(() => relevanceRowsFromDataset([record('p1', 'validation', true)])).toThrow(/unknown split/u);
    });
});
