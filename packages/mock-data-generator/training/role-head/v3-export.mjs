import { readFile } from 'node:fs/promises';
import { readJsonl, sha256 } from '../common/io.mjs';
import {
    FIELD_CONTEXT_SERIALIZER_FINGERPRINT,
    createMiniLmTokenizer,
    roleRegistryContract,
    serializeFieldContextV3
} from '../common/runtime.mjs';

export const V3_EXPORT_FORMAT = 'mockgen-v3-training-export';
export const V3_EXPORT_VERSION = 1;
const MAX_WORDPIECE_TOKENS = 64;

const isTrainingLabel = (roles, label) => label === 'unknown' || Object.hasOwn(roles, label);

/**
 * Export labelled v3 field contexts with the runtime serializer and WordPiece tokenizer.
 * @param {object} options options
 * @param {string} options.input JSONL of `{ id, group?, family?, service?, label, context }`
 * @param {string} options.vocabulary WordPiece vocabulary path
 * @returns {Promise<object>} the export envelope
 */
export async function exportV3Dataset({ input, vocabulary }) {
    const { roles, fingerprint } = roleRegistryContract();
    const vocabularyBytes = await readFile(vocabulary);
    const tokenizer = createMiniLmTokenizer(vocabularyBytes.toString('utf8'), MAX_WORDPIECE_TOKENS);
    const rows = (await readJsonl(input)).map((row, index) => {
        const context = row.context;
        if (context?.inputFormat !== 'v3') {
            throw new TypeError(`row ${index + 1} requires a v3 context`);
        }
        if (typeof row.label !== 'string' || !isTrainingLabel(roles, row.label)) {
            throw new TypeError(`row ${index + 1} label must be a registered semantic role`);
        }
        const serialized = serializeFieldContextV3(context);
        const encoded = tokenizer.encodeForModel(serialized);
        if (encoded.inputIds.length > MAX_WORDPIECE_TOKENS) {
            throw new TypeError(`row ${index + 1} exceeded the ${MAX_WORDPIECE_TOKENS}-token budget`);
        }
        return {
            id: row.id ?? `${context.entityName}.${context.propertyName}`,
            ...(typeof row.group === 'string' ? { group: row.group } : {}),
            ...(typeof row.family === 'string' ? { family: row.family } : {}),
            ...(typeof row.service === 'string' ? { service: row.service } : {}),
            context,
            label: row.label,
            serialized,
            inputIds: encoded.inputIds,
            attentionMask: encoded.attentionMask,
            tokenTypeIds: encoded.tokenTypeIds
        };
    });
    if (rows.length === 0 || new Set(rows.map((row) => row.id)).size !== rows.length) {
        throw new TypeError('export requires non-empty rows with unique IDs');
    }
    return {
        format: V3_EXPORT_FORMAT,
        version: V3_EXPORT_VERSION,
        rows,
        labels: [...new Set(rows.map((row) => row.label))].sort(),
        registryFingerprint: fingerprint,
        serializer: { fingerprint: FIELD_CONTEXT_SERIALIZER_FINGERPRINT },
        tokenizer: {
            algorithm: 'runtime-minilm-wordpiece',
            vocabularySha256: sha256(vocabularyBytes),
            maxWordPieceTokens: MAX_WORDPIECE_TOKENS
        },
        qualification: { status: 'unqualified', reason: 'Export parity only; no training or sealed evaluation.' }
    };
}

/**
 * Check an export against the loaded runtime: serializer, registry, vocabulary, labels and token IDs.
 * @param {object} options options
 * @param {object} options.artifact export envelope
 * @param {string} options.vocabulary WordPiece vocabulary path
 * @returns {Promise<true>} true when every check passes
 * @throws {TypeError} naming the first failed check
 */
export async function validateV3Dataset({ artifact, vocabulary }) {
    const { roles, fingerprint } = roleRegistryContract();
    if (artifact?.format !== V3_EXPORT_FORMAT || artifact.version !== V3_EXPORT_VERSION) {
        throw new TypeError('unsupported v3 training export format');
    }
    if (artifact.tokenizer?.maxWordPieceTokens !== MAX_WORDPIECE_TOKENS) {
        throw new TypeError('v3 artifacts require maxWordPieceTokens=64');
    }
    if (artifact.serializer?.fingerprint !== FIELD_CONTEXT_SERIALIZER_FINGERPRINT) {
        throw new TypeError('serializer fingerprint does not match the loaded runtime');
    }
    if (artifact.registryFingerprint !== fingerprint) {
        throw new TypeError('role registry fingerprint does not match the loaded runtime');
    }
    const vocabularyBytes = await readFile(vocabulary);
    if (artifact.tokenizer.vocabularySha256 !== sha256(vocabularyBytes)) {
        throw new TypeError('tokenizer vocabulary hash does not match the loaded vocabulary');
    }
    if (
        !Array.isArray(artifact.rows) ||
        artifact.rows.length === 0 ||
        new Set(artifact.rows.map((row) => row.id)).size !== artifact.rows.length
    ) {
        throw new TypeError('artifact requires non-empty rows with unique IDs');
    }
    if (artifact.rows.some((row) => typeof row.label !== 'string' || !isTrainingLabel(roles, row.label))) {
        throw new TypeError('artifact labels must be registered semantic roles');
    }
    const rowLabels = [...new Set(artifact.rows.map((row) => row.label))].sort();
    if (JSON.stringify(rowLabels) !== JSON.stringify([...(artifact.labels ?? [])].sort())) {
        throw new TypeError('artifact labels do not match row labels');
    }
    const tokenizer = createMiniLmTokenizer(vocabularyBytes.toString('utf8'), MAX_WORDPIECE_TOKENS);
    for (const [index, row] of artifact.rows.entries()) {
        if (!row.context || serializeFieldContextV3(row.context) !== row.serialized) {
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
