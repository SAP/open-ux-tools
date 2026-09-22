import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { exportV3Dataset, validateV3Dataset } from './lib/v3-export.mjs';
import { parseEdmx } from '../../packages/mock-data-generator/dist/schema/edmx.js';
import { createFieldContextV3 } from '../../packages/mock-data-generator/dist/semantics/field-context.js';
import {
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    serializeFieldContextV3
} from '../../packages/mock-data-generator/dist/index.js';
import { trainV3Head } from './lib/v3-train.mjs';
import { createEmbeddingSemanticClassifier } from '../../packages/mock-data-generator/dist/index.js';
import {
    SEMANTIC_ROLE_REGISTRY,
    SEMANTIC_ROLE_REGISTRY_FINGERPRINT
} from '../../packages/mock-data-generator/dist/semantics/role-registry.js';

test('exports runtime serializer and tokenizer IDs with bounded input', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-export-'));
    try {
        const vocabulary = join(directory, 'vocab.txt');
        const input = join(directory, 'rows.jsonl');
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'v3', '|', 'email'].join('\n'));
        await writeFile(
            input,
            `${JSON.stringify({
                id: 'Contact.Email',
                label: 'email',
                context: {
                    inputFormat: 'v3',
                    entityName: 'Contact',
                    propertyName: 'Email',
                    primitiveType: 'string',
                    nullable: false,
                    isKey: false,
                    facets: {},
                    annotations: [],
                    linkedMetadataPaths: [],
                    relationshipParticipation: [],
                    neighbors: []
                }
            })}\n`
        );
        const artifact = await exportV3Dataset({ input, vocabulary, maxWordPieceTokens: 64 });
        assert.equal(artifact.format, 'mockgen-v3-training-export');
        assert.deepEqual(artifact.labels, ['email']);
        assert.equal(artifact.registryFingerprint, SEMANTIC_ROLE_REGISTRY_FINGERPRINT);
        assert.ok(artifact.rows[0].inputIds.length <= 64);
        assert.equal(artifact.rows[0].inputIds.at(-1), 3);
        assert.equal(artifact.rows[0].serialized, 'Email (string, required) in Contact; a email field');
        await validateV3Dataset({ artifact, vocabulary, expectedLabels: ['email'], calibration: { temperature: 1 } });
        await assert.rejects(
            validateV3Dataset({ artifact: { ...artifact, registryFingerprint: 'a'.repeat(64) }, vocabulary }),
            /role registry fingerprint/u
        );
        assert.equal(JSON.parse(await readFile(input, 'utf8')).label, 'email');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('exports reviewed unknown as the v3 abstention target', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-unknown-'));
    try {
        const vocabulary = join(directory, 'vocab.txt');
        const input = join(directory, 'rows.jsonl');
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'v3', 'unknown'].join('\n'));
        await writeFile(
            input,
            `${JSON.stringify({
                id: 'service.Contact.Opaque',
                group: 'service',
                label: 'unknown',
                context: {
                    inputFormat: 'v3',
                    entityName: 'Contact',
                    propertyName: 'Opaque',
                    primitiveType: 'string',
                    nullable: true,
                    isKey: false,
                    facets: {},
                    annotations: [],
                    linkedMetadataPaths: [],
                    relationshipParticipation: [],
                    neighbors: []
                }
            })}\n`
        );
        const artifact = await exportV3Dataset({ input, vocabulary });
        assert.deepEqual(artifact.labels, ['unknown']);
        await validateV3Dataset({ artifact, vocabulary });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('rejects a changed tokenizer vocabulary during artifact validation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-export-'));
    try {
        const vocabulary = join(directory, 'vocab.txt');
        const input = join(directory, 'rows.jsonl');
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'email'].join('\n'));
        await writeFile(
            input,
            `${JSON.stringify({ label: 'email', context: { inputFormat: 'v3', entityName: 'C', propertyName: 'Email', primitiveType: 'string', nullable: true, isKey: false, facets: {}, annotations: [], linkedMetadataPaths: [], relationshipParticipation: [], neighbors: [] } })}\n`
        );
        const artifact = await exportV3Dataset({ input, vocabulary });
        await writeFile(vocabulary, `${await readFile(vocabulary, 'utf8')}changed\n`);
        await assert.rejects(validateV3Dataset({ artifact, vocabulary }), /vocabulary hash/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('keeps serializer fingerprint and token IDs aligned on finance metadata fixture', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-fixture-'));
    try {
        const vocabulary = join(directory, 'vocab.txt');
        const input = join(directory, 'rows.jsonl');
        const metadata = await readFile('packages/mock-data-generator/test/unit/finance-manage.metadata.xml', 'utf8');
        const graph = parseEdmx(metadata);
        const entity = graph.entities[0];
        const property = entity?.properties[0];
        assert.ok(entity && property);
        const context = createFieldContextV3(graph, entity, property);
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'v3'].join('\n'));
        await writeFile(input, `${JSON.stringify({ label: 'email', context })}\n`);
        const artifact = await exportV3Dataset({ input, vocabulary });
        assert.equal(artifact.serializer.fingerprint, FIELD_CONTEXT_SERIALIZER_FINGERPRINT);
        assert.equal(artifact.rows[0].serialized, serializeFieldContextV3(context));
        assert.equal(artifact.rows[0].inputIds[0], 2);
        assert.equal(artifact.rows[0].inputIds.at(-1), 3);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('trains and loads an unqualified v3 head from disjoint partitions', async () => {
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
    const rows = [
        { id: 'email-train', group: 'service-a', label: 'email', context: context('Email') },
        { id: 'email-cal', group: 'service-b', label: 'email', context: context('EmailAddress') },
        { id: 'country-train', group: 'service-a', label: 'country', context: context('Country') },
        { id: 'country-cal', group: 'service-b', label: 'country', context: context('CountryCode') },
        { id: 'unknown-train', group: 'service-a', label: 'unknown', context: context('Opaque') },
        { id: 'unknown-cal', group: 'service-b', label: 'unknown', context: context('Unspecified') }
    ];
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-train-'));
    try {
        const vocabulary = join(directory, 'vocab.txt');
        const input = join(directory, 'rows.jsonl');
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'email', 'country', 'unknown'].join('\n'));
        await writeFile(input, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
        const artifact = await exportV3Dataset({ input, vocabulary });
        const embedder = {
            embed: async (texts) =>
                texts.map((text) =>
                    text.includes('Country')
                        ? [0, 1]
                        : text.includes('Opaque') || text.includes('Unspecified')
                          ? [-1, -1]
                          : [1, 0]
                )
        };
        const head = await trainV3Head({
            artifact,
            trainIds: ['email-train', 'country-train', 'unknown-train'],
            calibrationIds: ['email-cal', 'country-cal', 'unknown-cal'],
            embedder,
            encoderSha256: 'a'.repeat(64)
        });
        assert.equal(head.qualification.status, 'unqualified');
        assert.equal(head.qualification.partitionPolicyVersion, 'group-disjoint-v1-development');
        await assert.rejects(
            trainV3Head({
                artifact: { ...artifact, registryFingerprint: 'a'.repeat(64) },
                trainIds: ['email-train', 'country-train', 'unknown-train'],
                calibrationIds: ['email-cal', 'country-cal', 'unknown-cal'],
                embedder,
                encoderSha256: 'a'.repeat(64)
            }),
            /role registry fingerprint/u
        );
        assert.ok(head.labels.includes('unknown'));
        assert.equal(head.labels.includes('REVIEW_ME'), false);
        assert.equal(head.training.algorithm, 'class-balanced-multinomial-logistic-gradient-descent');
        assert.ok(head.training.trainLossAfter < head.training.trainLossBefore);
        assert.deepEqual(head.qualification.calibrationLabelsAbsentFromTraining, []);
        assert.equal(head.calibrationSupport.minimumCorrectPerRole, 5);
        assert.equal(head.calibrationSupport.roles.email, 1);
        assert.ok(head.qualification.insufficientCalibrationRoles.includes('email'));
        const provenanceArtifact = {
            ...artifact,
            rows: artifact.rows.map((row) => ({ ...row, conversionManifestFingerprint: 'a'.repeat(64) }))
        };
        const provenanceHead = await trainV3Head({
            artifact: provenanceArtifact,
            trainIds: ['email-train', 'country-train', 'unknown-train'],
            calibrationIds: ['email-cal', 'country-cal', 'unknown-cal'],
            embedder,
            encoderSha256: 'a'.repeat(64)
        });
        assert.notEqual(provenanceHead.qualification.artifactFingerprint, head.qualification.artifactFingerprint);
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: 'development-head',
            embedder,
            head,
            serializeV3Input: serializeFieldContextV3,
            v3Roles: SEMANTIC_ROLE_REGISTRY,
            v3RegistryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
            v3SerializerFingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        });
        const result = await classifier.classify(context('Email'), new AbortController().signal);
        assert.equal(result.role, 'email');
        assert.ok(result.routeThreshold > 1);
        assert.ok(Array.isArray(result.predictionSet));
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('rejects serialized-context leakage across train and calibration partitions', async () => {
    const artifact = {
        format: 'mockgen-v3-training-export',
        tokenizer: { maxWordPieceTokens: 64, vocabularySha256: 'b'.repeat(64) },
        rows: [
            { id: 'train', group: 'service-a', label: 'email', serialized: 'same-context' },
            { id: 'calibration', group: 'service-b', label: 'email', serialized: 'same-context' }
        ]
    };
    await assert.rejects(
        trainV3Head({
            artifact,
            trainIds: ['train'],
            calibrationIds: ['calibration'],
            encoderSha256: 'a'.repeat(64),
            embedder: { embed: async () => [[1], [1]] }
        }),
        /share serialized contexts/
    );
});

test('rejects unregistered semantic labels and non-64-token artifacts', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-validation-'));
    const vocabulary = join(directory, 'vocab.txt');
    const artifact = {
        format: 'mockgen-v3-training-export',
        version: 1,
        registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
        serializer: { fingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT },
        tokenizer: { vocabularySha256: 'a'.repeat(64), maxWordPieceTokens: 32 },
        labels: ['not-a-registered-role'],
        rows: [
            {
                id: 'row',
                label: 'not-a-registered-role',
                serialized: 'x',
                context: { inputFormat: 'v3' },
                inputIds: [],
                attentionMask: [],
                tokenTypeIds: []
            }
        ]
    };
    try {
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]'].join('\n'));
        artifact.tokenizer.vocabularySha256 = createHash('sha256')
            .update(await readFile(vocabulary))
            .digest('hex');
        await assert.rejects(validateV3Dataset({ artifact, vocabulary }), /maxWordPieceTokens=64/);
        artifact.tokenizer.maxWordPieceTokens = 64;
        await assert.rejects(validateV3Dataset({ artifact, vocabulary }), /registered semantic role/);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('rejects unlabeled training rows before invoking the embedder', async () => {
    let embedded = false;
    const artifact = {
        format: 'mockgen-v3-training-export',
        tokenizer: { maxWordPieceTokens: 64 },
        rows: [
            { id: 'train', group: 'a', serialized: 'x' },
            { id: 'cal', group: 'b', label: 'email', serialized: 'y' }
        ]
    };
    await assert.rejects(
        trainV3Head({
            artifact,
            trainIds: ['train'],
            calibrationIds: ['cal'],
            encoderSha256: 'a'.repeat(64),
            embedder: {
                embed: async () => {
                    embedded = true;
                    return [[1]];
                }
            }
        }),
        /non-empty label/
    );
    assert.equal(embedded, false);
});

test('requires reviewed unknown examples in training and calibration before embedding', async () => {
    let embedded = false;
    const artifact = {
        format: 'mockgen-v3-training-export',
        tokenizer: { maxWordPieceTokens: 64 },
        rows: [
            { id: 'train', group: 'a', label: 'email', serialized: 'email-a' },
            { id: 'cal', group: 'b', label: 'email', serialized: 'email-b' }
        ]
    };
    await assert.rejects(
        trainV3Head({
            artifact,
            trainIds: ['train'],
            calibrationIds: ['cal'],
            encoderSha256: 'a'.repeat(64),
            embedder: {
                embed: async () => {
                    embedded = true;
                    return [[1]];
                }
            }
        }),
        /unknown abstention examples in train and calibration/u
    );
    assert.equal(embedded, false);
});

test('keeps source family provenance in export and rejects sibling-service calibration leakage', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mockgen-v3-family-'));
    try {
        const vocabulary = join(directory, 'vocab.txt');
        const input = join(directory, 'rows.jsonl');
        await writeFile(vocabulary, ['[PAD]', '[UNK]', '[CLS]', '[SEP]', 'email', 'unknown'].join('\n'));
        const context = (name) => ({
            inputFormat: 'v3',
            entityName: 'Contact',
            propertyName: name,
            primitiveType: 'string',
            nullable: true,
            isKey: false,
            facets: {},
            annotations: [],
            linkedMetadataPaths: [],
            relationshipParticipation: [],
            neighbors: []
        });
        const records = [
            { id: 'a-email', group: 'service-a', family: 'family-one', label: 'email', context: context('Email') },
            { id: 'a-unknown', group: 'service-a', family: 'family-one', label: 'unknown', context: context('Opaque') },
            {
                id: 'b-email',
                group: 'service-b',
                family: 'family-one',
                label: 'email',
                context: context('EmailAddress')
            },
            { id: 'b-unknown', group: 'service-b', family: 'family-one', label: 'unknown', context: context('Other') }
        ];
        await writeFile(input, `${records.map((row) => JSON.stringify(row)).join('\n')}\n`);
        const artifact = await exportV3Dataset({ input, vocabulary });
        assert.equal(artifact.rows[0].family, 'family-one');
        await assert.rejects(
            trainV3Head({
                artifact,
                trainIds: ['a-email', 'a-unknown'],
                calibrationIds: ['b-email', 'b-unknown'],
                encoderSha256: 'a'.repeat(64),
                embedder: {
                    embed: async () => {
                        throw new Error('should not allocate encoder');
                    }
                }
            }),
            /service families/u
        );
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

test('balances minority role examples without treating REVIEW_ME as a class', async () => {
    const artifact = {
        format: 'mockgen-v3-training-export',
        tokenizer: { maxWordPieceTokens: 64, vocabularySha256: 'b'.repeat(64) },
        rows: [
            { id: 'train-email', group: 'train', label: 'email', serialized: 'email-train' },
            ...Array.from({ length: 9 }, (_value, index) => ({
                id: `train-unknown-${index}`,
                group: 'train',
                label: 'unknown',
                serialized: `opaque-${index}`
            })),
            { id: 'cal-email', group: 'cal', label: 'email', serialized: 'email-cal' },
            { id: 'cal-unknown', group: 'cal', label: 'unknown', serialized: 'opaque-cal' }
        ]
    };
    const head = await trainV3Head({
        artifact,
        trainIds: artifact.rows.filter((row) => row.group === 'train').map((row) => row.id),
        calibrationIds: ['cal-email', 'cal-unknown'],
        encoderSha256: 'a'.repeat(64),
        embedder: { embed: async (texts) => texts.map((text) => (text.startsWith('email') ? [1] : [-1])) }
    });
    assert.ok(head.training.classWeights.email > head.training.classWeights.unknown);
    assert.match(head.training.algorithm, /class-balanced/u);
});

test('refuses contradictory labels for one training context before embedding', async () => {
    const artifact = {
        format: 'mockgen-v3-training-export',
        tokenizer: { maxWordPieceTokens: 64, vocabularySha256: 'b'.repeat(64) },
        rows: [
            { id: 'train-email', group: 'train', label: 'email', serialized: 'same' },
            { id: 'train-unknown', group: 'train', label: 'unknown', serialized: 'same' },
            { id: 'cal-email', group: 'cal', label: 'email', serialized: 'different-email' },
            { id: 'cal-unknown', group: 'cal', label: 'unknown', serialized: 'different-unknown' }
        ]
    };
    await assert.rejects(
        trainV3Head({
            artifact,
            trainIds: ['train-email', 'train-unknown'],
            calibrationIds: ['cal-email', 'cal-unknown'],
            encoderSha256: 'a'.repeat(64),
            embedder: {
                embed: async () => {
                    throw new Error('should not embed contradictory labels');
                }
            }
        }),
        /conflicting labels/u
    );
});
