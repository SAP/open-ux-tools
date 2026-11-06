const STRING_BANK_KINDS = new Set(['code', 'name', 'text', 'identifier']);
const NUMERIC_KINDS = new Set(['number', 'decimal']);

/** Fewest distinct examples a concept needs for a prototype. */
export const MINIMUM_EXAMPLES = 5;

/**
 * The bank of one published concept record: `bank_values` for string kinds, `bank_pairs` for `code-text`,
 * `bank_range` for `number` / `decimal`.
 * @param {object} record `concepts/train` record
 * @returns {{ values: string[] } | { pairs: object[] } | { range: object } | undefined} the bank, or undefined when empty or invalid
 */
function conceptBank(record) {
    const kind = record.value_kind;
    if (STRING_BANK_KINDS.has(kind)) {
        const values = [
            ...new Set((record.bank_values ?? []).filter((value) => typeof value === 'string' && value.length > 0))
        ];
        return values.length > 0 ? { values } : undefined;
    }
    if (kind === 'code-text') {
        const pairs = (record.bank_pairs ?? [])
            .filter(
                (pair) => typeof pair?.code === 'string' && pair.code && typeof pair?.text === 'string' && pair.text
            )
            .map(({ code, text }) => ({ code, text }));
        return pairs.length > 0 ? { pairs } : undefined;
    }
    if (NUMERIC_KINDS.has(kind)) {
        const range = record.bank_range;
        const valid =
            Number.isFinite(range?.min) &&
            Number.isFinite(range?.max) &&
            Number.isInteger(range?.scale) &&
            range.min <= range.max;
        return valid ? { range: { min: range.min, max: range.max, scale: range.scale } } : undefined;
    }
    return undefined;
}

/**
 * Turn the published concept records into catalogue entries with their banks. A concept with an empty
 * bank or an unknown value kind refuses the build: a silently smaller head loses concepts.
 * @param {object[]} records `concepts/train` records in file order
 * @returns {object[]} `{ id, name, valueKind, types, values | pairs | range }` per concept
 * @throws {TypeError} naming the concepts without a usable bank
 */
export function conceptCatalogue(records) {
    const refused = [];
    const catalogue = [];
    for (const record of records) {
        const bank = conceptBank(record);
        if (bank) {
            catalogue.push({
                id: record.id,
                name: record.name,
                valueKind: record.value_kind,
                types: record.types,
                ...bank
            });
        } else {
            refused.push(`${record.id} (${record.value_kind})`);
        }
    }
    if (refused.length > 0) {
        throw new TypeError(`${refused.length} concepts have no usable bank: ${refused.slice(0, 20).join('; ')}`);
    }
    return catalogue;
}

/**
 * Percentile with linear interpolation between the two nearest ranks.
 * @param {number[]} values values
 * @param {number} p fraction in [0, 1]
 * @returns {number} the percentile
 */
export function percentile(values, p) {
    const sorted = [...values].sort((left, right) => left - right);
    const at = (sorted.length - 1) * p;
    const low = Math.floor(at);
    return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
}

const unit = (vector) => {
    const norm = Math.hypot(...vector) || 1;
    return Float64Array.from(vector, (value) => value / norm);
};
const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
const round4 = (value) => Math.round(value * 10_000) / 10_000;

/**
 * The prototype of one concept (normalised mean of its unit example vectors) and its acceptance inputs:
 * `minimumSimilarity` is the 25th percentile of the examples' similarity to the prototype.
 * @param {number[][]} vectors example embeddings
 * @returns {{ prototype: Float64Array, minimumSimilarity: number, cohesion: object } | undefined} undefined when the examples are not cohesive
 */
export function conceptPrototype(vectors) {
    const units = vectors.map(unit);
    const mean = new Float64Array(units[0].length);
    for (const vector of units) {
        vector.forEach((value, index) => {
            mean[index] += value;
        });
    }
    const prototype = unit(mean);
    const similarities = units.map((vector) => dot(vector, prototype));
    const p25 = percentile(similarities, 0.25);
    if (!(p25 > 0 && p25 <= 1)) {
        return undefined;
    }
    return {
        prototype,
        minimumSimilarity: p25,
        cohesion: {
            p10: round4(percentile(similarities, 0.1)),
            p25: round4(p25),
            p50: round4(percentile(similarities, 0.5)),
            examples: vectors.length
        }
    };
}

/**
 * Build the concept head (format version 2) and the concept banks it needs. Each concept's prototype
 * comes from its first `maxExamples` distinct serialised examples in file order; a concept with fewer
 * than five is left out and reported.
 * @param {object} options options
 * @param {object[]} options.catalogue output of `conceptCatalogue`
 * @param {Map<string, string[]>} options.textsByConcept serialised example texts per concept, in file order
 * @param {(texts: string[]) => Promise<number[][]>} options.embed encoder
 * @param {{ dim: number, encoderSha256: string, tokenizerSha256: string, serializerFingerprint: string }} options.contract classifier contract
 * @param {{ similarity: number, margin: number }} options.thresholds global acceptance thresholds
 * @param {number} [options.maxExamples] examples per prototype
 * @returns {Promise<{ head: object, banks: Record<string, object>, tooFewExamples: string[] }>} head, `concept:<id>` banks and skipped ids
 */
export async function buildConceptHead({ catalogue, textsByConcept, embed, contract, thresholds, maxExamples = 100 }) {
    const concepts = [];
    const banks = {};
    const buffer = [];
    const tooFewExamples = [];
    for (const { id, name, valueKind, types, ...bank } of catalogue) {
        const texts = [...new Set(textsByConcept.get(id) ?? [])].slice(0, maxExamples);
        const built = texts.length >= MINIMUM_EXAMPLES ? conceptPrototype(await embed(texts)) : undefined;
        if (!built || built.prototype.length !== contract.dim) {
            tooFewExamples.push(id);
            continue;
        }
        buffer.push(...built.prototype);
        concepts.push({ id, minimumSimilarity: built.minimumSimilarity, cohesion: built.cohesion });
        banks[`concept:${id}`] = { kind: 'concept', id, name, valueKind, types, ...bank };
    }
    const bytes = Buffer.alloc(buffer.length * 4);
    buffer.forEach((value, index) => bytes.writeFloatLE(value, index * 4));
    const head = {
        format: 'mockgen-concept-head',
        version: 2,
        dim: contract.dim,
        encoderSha256: contract.encoderSha256,
        tokenizerSha256: contract.tokenizerSha256,
        serializerFingerprint: contract.serializerFingerprint,
        thresholds: { similarity: thresholds.similarity, margin: thresholds.margin },
        prototypes: bytes.toString('base64'),
        concepts
    };
    return { head, banks, tooFewExamples };
}

/**
 * Replace the concept banks of a value-bank store, keeping every other bank first and in order.
 * @param {object} store value-bank store document
 * @param {Record<string, object>} conceptBanks `concept:<id>` banks
 * @returns {object} the new store document
 */
export function replaceConceptBanks(store, conceptBanks) {
    const others = Object.fromEntries(Object.entries(store.banks).filter(([, bank]) => bank.kind !== 'concept'));
    return { ...store, banks: { ...others, ...conceptBanks } };
}
