import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

// These are deliberately loaded from the built runtime. Keeping this boundary
// here prevents the exporter from growing a second serializer or tokenizer.
const runtime = await import('../../../packages/mock-data-generator/dist/index.js');
const tokenizerModule = await import('../../../packages/mock-data-generator/dist/model/minilm-tokenizer.js');
const { SEMANTIC_ROLE_REGISTRY, SEMANTIC_ROLE_REGISTRY_FINGERPRINT } =
    await import('../../../packages/mock-data-generator/dist/semantics/role-registry.js');

export const V3_EXPORT_FORMAT = 'mockgen-v3-training-export';
export const V3_EXPORT_VERSION = 1;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isTrainingLabel = (label) => label === 'unknown' || Boolean(SEMANTIC_ROLE_REGISTRY[label]);

function readContext(row, lineNumber) {
    const context = row.context ?? row.fieldContext;
    if (context === null || typeof context !== 'object' || Array.isArray(context)) {
        throw new TypeError(`row ${lineNumber} must contain a context object`);
    }
    if (context.inputFormat !== 'v3') {
        throw new TypeError(`row ${lineNumber} context.inputFormat must be v3`);
    }
    return context;
}

function readRows(input) {
    return input
        .split(/\r?\n/u)
        .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
        .filter(({ line }) => line.length > 0)
        .map(({ line, lineNumber }) => {
            try {
                return { row: JSON.parse(line), lineNumber };
            } catch (error) {
                throw new TypeError(`row ${lineNumber} is not valid JSON: ${error.message}`);
            }
        });
}

export async function exportV3Dataset({ input, vocabulary, maxWordPieceTokens = 64, calibration }) {
    if (maxWordPieceTokens !== 64) {
        throw new TypeError('v3 training export requires maxWordPieceTokens=64');
    }
    const vocabularyBytes = await readFile(vocabulary);
    const tokenizer = tokenizerModule.createMiniLmTokenizer(vocabularyBytes.toString('utf8'), maxWordPieceTokens);
    const rows = readRows(await readFile(input, 'utf8')).map(({ row, lineNumber }) => {
        const context = readContext(row, lineNumber);
        if (typeof row.label !== 'string' || row.label.length === 0) {
            throw new TypeError(`row ${lineNumber} requires a non-empty registered label`);
        }
        if (!isTrainingLabel(row.label)) {
            throw new TypeError(`row ${lineNumber} label must be a registered semantic role`);
        }
        const serialized = runtime.serializeFieldContextV3(context);
        const encoded = tokenizer.encodeForModel(serialized);
        if (encoded.inputIds.length > maxWordPieceTokens) {
            throw new TypeError(`row ${lineNumber} exceeded the ${maxWordPieceTokens}-token budget`);
        }
        return {
            id: row.id ?? `${context.entityName}.${context.propertyName}`,
            ...(typeof row.group === 'string' ? { group: row.group } : {}),
            ...(typeof row.family === 'string' ? { family: row.family } : {}),
            ...(typeof row.service === 'string' ? { service: row.service } : {}),
            ...(typeof row.conversionManifestFingerprint === 'string'
                ? { conversionManifestFingerprint: row.conversionManifestFingerprint }
                : {}),
            context,
            label: row.label,
            serialized,
            inputIds: encoded.inputIds,
            attentionMask: encoded.attentionMask,
            tokenTypeIds: encoded.tokenTypeIds
        };
    });
    const labels = [...new Set(rows.map((row) => row.label).filter((label) => label !== undefined))].sort();
    const conversionManifestFingerprints = [
        ...new Set(
            rows.map((row) => row.conversionManifestFingerprint).filter((fingerprint) => fingerprint !== undefined)
        )
    ];
    const ids = rows.map((row) => row.id);
    if (
        rows.length === 0 ||
        new Set(ids).size !== ids.length ||
        rows.some((row) => typeof row.id !== 'string' || row.id.length === 0)
    ) {
        throw new TypeError('export requires non-empty rows with unique IDs');
    }
    return {
        format: V3_EXPORT_FORMAT,
        version: V3_EXPORT_VERSION,
        rows,
        labels,
        registryFingerprint: SEMANTIC_ROLE_REGISTRY_FINGERPRINT,
        serializer: {
            version: runtime.FIELD_CONTEXT_SERIALIZER_VERSION,
            fingerprint: runtime.FIELD_CONTEXT_SERIALIZER_FINGERPRINT
        },
        tokenizer: {
            algorithm: 'runtime-minilm-wordpiece',
            vocabularySha256: sha256(vocabularyBytes),
            maxWordPieceTokens
        },
        ...(conversionManifestFingerprints.length === 0
            ? {}
            : conversionManifestFingerprints.length === 1
              ? { provenance: { conversionManifestFingerprint: conversionManifestFingerprints[0] } }
              : (() => {
                    throw new TypeError('export requires one conversion manifest fingerprint');
                })()),
        ...(calibration === undefined ? {} : { calibration }),
        qualification: {
            status: 'unqualified',
            reason: 'Export parity only; no model training or sealed evaluation was performed.'
        }
    };
}

export async function writeV3Dataset(options) {
    const artifact = await exportV3Dataset(options);
    await writeFile(options.output, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
}

export async function validateV3Dataset({ artifact, vocabulary, expectedLabels, calibration = artifact?.calibration }) {
    if (artifact?.format !== V3_EXPORT_FORMAT || artifact.version !== V3_EXPORT_VERSION) {
        throw new TypeError('unsupported v3 training export format');
    }
    if (artifact.tokenizer?.maxWordPieceTokens !== 64) {
        throw new TypeError('v3 artifacts require maxWordPieceTokens=64');
    }
    if (artifact.serializer?.fingerprint !== runtime.FIELD_CONTEXT_SERIALIZER_FINGERPRINT) {
        throw new TypeError('serializer fingerprint does not match the loaded runtime');
    }
    if (artifact.registryFingerprint !== SEMANTIC_ROLE_REGISTRY_FINGERPRINT) {
        throw new TypeError('role registry fingerprint does not match the loaded runtime');
    }
    const vocabularyBytes = await readFile(vocabulary);
    const tokenizer = tokenizerModule.createMiniLmTokenizer(
        vocabularyBytes.toString('utf8'),
        artifact.tokenizer.maxWordPieceTokens
    );
    if (artifact.tokenizer?.vocabularySha256 !== sha256(vocabularyBytes)) {
        throw new TypeError('tokenizer vocabulary hash does not match the loaded vocabulary');
    }
    if (
        !Array.isArray(artifact.rows) ||
        artifact.rows.length === 0 ||
        new Set(artifact.rows.map((row) => row.id)).size !== artifact.rows.length
    ) {
        throw new TypeError('artifact requires non-empty rows with unique IDs');
    }
    if (
        !Array.isArray(artifact.labels) ||
        artifact.labels.some((label) => typeof label !== 'string') ||
        artifact.rows.some((row) => typeof row.label !== 'string' || row.label.length === 0)
    ) {
        throw new TypeError('labels must be an array of strings');
    }
    if (
        artifact.labels.some((label) => !isTrainingLabel(label)) ||
        artifact.rows.some((row) => !isTrainingLabel(row.label))
    ) {
        throw new TypeError('artifact labels must be registered semantic roles');
    }
    if (artifact.provenance?.conversionManifestFingerprint !== undefined) {
        if (
            typeof artifact.provenance.conversionManifestFingerprint !== 'string' ||
            artifact.provenance.conversionManifestFingerprint.length === 0 ||
            artifact.rows.some(
                (row) => row.conversionManifestFingerprint !== artifact.provenance.conversionManifestFingerprint
            )
        ) {
            throw new TypeError('artifact conversion manifest provenance does not match rows');
        }
    }
    const rowLabels = [...new Set(artifact.rows.map((row) => row.label))].sort();
    if (JSON.stringify(rowLabels) !== JSON.stringify([...artifact.labels].sort()))
        throw new TypeError('artifact labels do not match row labels');
    if (expectedLabels && JSON.stringify([...expectedLabels].sort()) !== JSON.stringify([...artifact.labels].sort())) {
        throw new TypeError('artifact labels do not match the expected label set');
    }
    if (calibration !== undefined) {
        if (calibration === null || typeof calibration !== 'object' || typeof calibration.temperature !== 'number') {
            throw new TypeError('calibration metadata must include a numeric temperature');
        }
        if (
            artifact.calibration !== undefined &&
            JSON.stringify(artifact.calibration) !== JSON.stringify(calibration)
        ) {
            throw new TypeError('artifact calibration metadata does not match the expected calibration');
        }
        if (!(calibration.temperature > 0) || !Number.isFinite(calibration.temperature)) {
            throw new TypeError('calibration temperature must be finite and positive');
        }
    }
    for (const [index, row] of (artifact.rows ?? []).entries()) {
        if (!Array.isArray(row.inputIds) || row.inputIds.length > artifact.tokenizer.maxWordPieceTokens) {
            throw new TypeError(`row ${index} has invalid token IDs`);
        }
        if (row.inputIds.length !== row.attentionMask?.length || row.inputIds.length !== row.tokenTypeIds?.length) {
            throw new TypeError(`row ${index} token arrays have inconsistent lengths`);
        }
        if (!row.context || runtime.serializeFieldContextV3(row.context) !== row.serialized) {
            throw new TypeError(`row ${index} serialized context does not match the runtime serializer`);
        }
        const encoded = tokenizer.encodeForModel(row.serialized);
        if (
            JSON.stringify(encoded.inputIds) !== JSON.stringify(row.inputIds) ||
            JSON.stringify(encoded.attentionMask) !== JSON.stringify(row.attentionMask) ||
            JSON.stringify(encoded.tokenTypeIds) !== JSON.stringify(row.tokenTypeIds)
        ) {
            throw new TypeError(`row ${index} token IDs do not match the runtime tokenizer`);
        }
    }
    return true;
}
