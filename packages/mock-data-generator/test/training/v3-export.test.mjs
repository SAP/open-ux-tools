import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    createEmbeddingSemanticClassifier,
    createFieldContextV3,
    parseEdmx,
    roleRegistryContract,
    serializeFieldContextV3,
    v3ClassifierContract
} from '../../training/common/runtime.mjs';
import { exportV3Dataset, validateV3Dataset } from '../../training/role-head/v3-export.mjs';
import { trainV3Head } from '../../training/role-head/v3-train.mjs';

const context = (propertyName) => ({
    inputFormat: 'v3',
    entityName: 'Contact',
    propertyName,
    primitiveType: 'string',
    nullable: false,
    isKey: false,
    facets: {},
    annotations: [],
    linkedMetadataPaths: [],
    relationshipParticipation: [],
    neighbors: []
});
const BASE_VOCABULARY = ['[PAD]', '[UNK]', '[CLS]', '[SEP]'];

let directory;
beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-'));
});
afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
});

/**
 * Write a vocabulary and a JSONL input into the test directory.
 * @param {string[]} words extra vocabulary words
 * @param {object[]} records input records
 * @returns {Promise<{ vocabulary: string, input: string }>} the paths
 */
async function fixture(words, records) {
    const vocabulary = join(directory, 'vocab.txt');
    const input = join(directory, 'rows.jsonl');
    await writeFile(vocabulary, [...BASE_VOCABULARY, ...words].join('\n'));
    await writeFile(input, records.map((record) => `${JSON.stringify(record)}\n`).join(''));
    return { vocabulary, input };
}

describe('exportV3Dataset / validateV3Dataset', () => {
    test('exports runtime serializer and tokenizer ids within the 64-token budget', async () => {
        // Given one labelled email context
        const paths = await fixture(['email'], [{ id: 'Contact.Email', label: 'email', context: context('Email') }]);
        // When exported
        const artifact = await exportV3Dataset(paths);
        // Then the envelope pins the runtime contract and the ids end with [SEP]
        expect(artifact).toMatchObject({
            format: 'mockgen-v3-training-export',
            labels: ['email'],
            registryFingerprint: roleRegistryContract().fingerprint,
            serializer: { fingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT }
        });
        expect(artifact.rows[0].serialized).toBe(serializeFieldContextV3(context('Email')));
        expect(artifact.rows[0].inputIds.length).toBeLessThanOrEqual(64);
        expect(artifact.rows[0].inputIds.at(-1)).toBe(3);
        await expect(validateV3Dataset({ artifact, vocabulary: paths.vocabulary })).resolves.toBe(true);
        await expect(
            validateV3Dataset({
                artifact: { ...artifact, registryFingerprint: 'a'.repeat(64) },
                vocabulary: paths.vocabulary
            })
        ).rejects.toThrow(/role registry fingerprint/u);
    });

    test('keeps the serializer aligned on a metadata fixture', async () => {
        // Given a context built from real metadata
        const graph = parseEdmx(
            await readFile(new URL('../unit/synthetic-finance.metadata.xml', import.meta.url), 'utf8')
        );
        const [entity] = graph.entities;
        const fieldContext = createFieldContextV3(graph, entity, entity.properties[0]);
        const paths = await fixture([], [{ label: 'email', context: fieldContext }]);
        // When exported
        const artifact = await exportV3Dataset(paths);
        // Then the text is the runtime serialization, framed by [CLS] and [SEP]
        expect(artifact.rows[0].serialized).toBe(serializeFieldContextV3(fieldContext));
        expect(artifact.rows[0].inputIds[0]).toBe(2);
        expect(artifact.rows[0].inputIds.at(-1)).toBe(3);
    });

    test('rejects a changed vocabulary, unregistered labels and non-64-token artifacts', async () => {
        // Given an export whose vocabulary changes afterwards
        const paths = await fixture(['email'], [{ label: 'email', context: context('Email') }]);
        const artifact = await exportV3Dataset(paths);
        await writeFile(paths.vocabulary, `${await readFile(paths.vocabulary, 'utf8')}\nchanged\n`);
        await expect(validateV3Dataset({ artifact, vocabulary: paths.vocabulary })).rejects.toThrow(/vocabulary hash/u);
        // Given a 32-token artifact, then validation refuses
        const vocabularySha256 = createHash('sha256')
            .update(await readFile(paths.vocabulary))
            .digest('hex');
        const short = { ...artifact, tokenizer: { ...artifact.tokenizer, vocabularySha256, maxWordPieceTokens: 32 } };
        await expect(validateV3Dataset({ artifact: short, vocabulary: paths.vocabulary })).rejects.toThrow(
            /maxWordPieceTokens=64/u
        );
        // Given an unregistered label, then the export refuses
        const bad = await fixture([], [{ label: 'not-a-registered-role', context: context('X') }]);
        await expect(exportV3Dataset(bad)).rejects.toThrow(/registered semantic role/u);
    });

    test('keeps the source family in the export', async () => {
        // Given a record with a service family
        const paths = await fixture(
            [],
            [{ id: 'a', group: 'svc-a', family: 'fam-1', label: 'unknown', context: context('Opaque') }]
        );
        // Then the exported row keeps it
        expect((await exportV3Dataset(paths)).rows[0]).toMatchObject({ group: 'svc-a', family: 'fam-1' });
    });
});

describe('trainV3Head', () => {
    const records = [
        { id: 'email-train', group: 'service-a', label: 'email', context: context('Email') },
        { id: 'email-cal', group: 'service-b', label: 'email', context: context('EmailAddress') },
        { id: 'country-train', group: 'service-a', label: 'country', context: context('Country') },
        { id: 'country-cal', group: 'service-b', label: 'country', context: context('CountryCode') },
        { id: 'unknown-train', group: 'service-a', label: 'unknown', context: context('Opaque') },
        { id: 'unknown-cal', group: 'service-b', label: 'unknown', context: context('Unspecified') }
    ];
    const vectorOf = (text) => {
        if (text.includes('Country')) {
            return [0, 1];
        }
        return text.includes('Opaque') || text.includes('Unspecified') ? [-1, -1] : [1, 0];
    };
    const embedder = { embed: async (texts) => texts.map(vectorOf) };
    // A ReLU layer that passes both axes through, then one class per direction.
    const pretrained = {
        model: 'runtime-minilm-l6-v2-mlp',
        dim: 2,
        labels: ['unknown', 'email', 'country'],
        hidden: {
            weights: [
                [1, 0],
                [0, 1],
                [-1, -1]
            ],
            bias: [0, 0, 0]
        },
        coef: [
            [0, 0, 6],
            [6, 0, 0],
            [0, 6, 0]
        ],
        intercept: [0, 0, 0],
        training: { algorithm: 'mlp-test' }
    };
    const options = (artifact) => ({
        artifact,
        trainIds: ['email-train', 'country-train', 'unknown-train'],
        calibrationIds: ['email-cal', 'country-cal', 'unknown-cal'],
        embedder,
        encoderSha256: 'a'.repeat(64),
        pretrained
    });

    test('calibrates a pretrained head into an unqualified v3 head the runtime loads', async () => {
        // Given an export and a pretrained MLP that separates the three classes
        const artifact = await exportV3Dataset(await fixture(['email', 'country', 'unknown'], records));
        // When calibrated
        const head = await trainV3Head(options(artifact));
        // Then it is unqualified, group-disjoint, keeps the pretrained layers and reorders classes
        expect(head.qualification.status).toBe('unqualified');
        expect(head.qualification.partitionPolicyVersion).toBe('group-disjoint-v1-development');
        expect(head.labels).toEqual(['country', 'email', 'unknown']);
        expect(head.coef[0]).toEqual([0, 6, 0]);
        expect(head.training.algorithm).toBe('mlp-test');
        expect(head.calibrationSupport.roles.email).toBe(1);
        // One calibration example per role is below the support floor, so every role stays auxiliary.
        expect(head.auxiliaryLabels).toEqual(['country', 'email']);
        expect(head.qualification.insufficientCalibrationRoles).toContain('email');
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'dev',
            embedder,
            head,
            ...v3ClassifierContract()
        });
        const result = await classifier.classify(context('Email'), new AbortController().signal);
        expect(Array.isArray(result.predictionSet)).toBe(true);
    });

    test('refuses a registry mismatch and pretrained labels that differ from the export', async () => {
        // Given an export from another registry, or a pretrained head with other labels
        const artifact = await exportV3Dataset(await fixture(['email', 'country', 'unknown'], records));
        await expect(trainV3Head(options({ ...artifact, registryFingerprint: 'a'.repeat(64) }))).rejects.toThrow(
            /role registry fingerprint/u
        );
        await expect(
            trainV3Head({ ...options(artifact), pretrained: { ...pretrained, labels: ['unknown', 'email', 'city'] } })
        ).rejects.toThrow(/pretrained head labels/u);
    });

    test('refuses leaking, unlabelled, conflicting or abstention-free partitions before embedding', async () => {
        // Given an embedder that must never be called
        const never = {
            embed: async () => {
                throw new Error('should not embed');
            }
        };
        const envelope = (rows) => ({
            format: 'mockgen-v3-training-export',
            tokenizer: { maxWordPieceTokens: 64 },
            rows
        });
        const attempt = (rows, trainIds, calibrationIds) =>
            trainV3Head({
                artifact: envelope(rows),
                trainIds,
                calibrationIds,
                encoderSha256: 'a'.repeat(64),
                embedder: never,
                pretrained
            });
        // Then each broken partition is refused with its reason
        await expect(
            attempt(
                [
                    { id: 't', group: 'a', label: 'email', serialized: 'same' },
                    { id: 'c', group: 'b', label: 'email', serialized: 'same' }
                ],
                ['t'],
                ['c']
            )
        ).rejects.toThrow(/share serialized contexts/u);
        await expect(
            attempt(
                [
                    { id: 't', group: 'a', serialized: 'x' },
                    { id: 'c', group: 'b', label: 'email', serialized: 'y' }
                ],
                ['t'],
                ['c']
            )
        ).rejects.toThrow(/non-empty label/u);
        await expect(
            attempt(
                [
                    { id: 't', group: 'a', label: 'email', serialized: 'email-a' },
                    { id: 'c', group: 'b', label: 'email', serialized: 'email-b' }
                ],
                ['t'],
                ['c']
            )
        ).rejects.toThrow(/unknown abstention examples in train and calibration/u);
        await expect(
            attempt(
                [
                    { id: 't1', group: 'a', label: 'email', serialized: 'same' },
                    { id: 't2', group: 'a', label: 'unknown', serialized: 'same' },
                    { id: 'c1', group: 'b', label: 'email', serialized: 'e' },
                    { id: 'c2', group: 'b', label: 'unknown', serialized: 'u' }
                ],
                ['t1', 't2'],
                ['c1', 'c2']
            )
        ).rejects.toThrow(/conflicting labels/u);
        await expect(
            attempt(
                [
                    { id: 't1', group: 'a', family: 'f', label: 'email', serialized: 'e1' },
                    { id: 't2', group: 'a', family: 'f', label: 'unknown', serialized: 'u1' },
                    { id: 'c1', group: 'b', family: 'f', label: 'email', serialized: 'e2' },
                    { id: 'c2', group: 'b', family: 'f', label: 'unknown', serialized: 'u2' }
                ],
                ['t1', 't2'],
                ['c1', 'c2']
            )
        ).rejects.toThrow(/service families/u);
    });
});
