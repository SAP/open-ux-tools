import type { PrimitiveType, SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { packagedBanks } from '../semantics/bank-store.js';
import { identifierTokens } from '../naming.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRules } from '../semantics/rule-store.js';
import { VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import type { ExistingMockData, JsonValue, MockDataRow, SemanticClassification } from '../types.js';
import { authoredRows, generatedRowFlags } from './authored.js';
import { displayName } from './code-list-metadata.js';
import { propertyValueIsValid } from './constraints.js';
import { protectedPropertyNames } from './rows.js';
import { effectiveValueListParameters } from './value-list-context.js';

/** A code and the field that holds its text. */
export interface CodeTextPair {
    code: SchemaProperty;
    text: SchemaProperty;
}

/** The terms that declare a value help on a field; its values are then codes of a list. */
const VALUE_HELP_TERM_SUFFIXES: ReadonlyArray<string> = [
    VOCABULARY_TERM_SUFFIX.valueList,
    VOCABULARY_TERM_SUFFIX.valueListReferences,
    VOCABULARY_TERM_SUFFIX.valueListWithFixedValues,
    VOCABULARY_TERM_SUFFIX.valueListMapping
];

/** The types a code is written in. */
const CODE_TYPES: ReadonlySet<PrimitiveType> = new Set<PrimitiveType>(['string', 'int']);

/**
 * A field name as one lower-case run of letters and digits, so `Payment_Group` and `PaymentGroup` compare equal.
 *
 * @param name field name
 * @returns the compact name
 */
function compactName(name: string): string {
    return name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Whether a field is a name form: the last word of its name is a text word (`ShelfName`, `PaymentGroupText`),
 * so it holds words that name something, never a code. A name of one word (`Context`) has no word boundary to
 * read, so it is not a name form by its name alone.
 *
 * @param property the field
 * @returns true for a name form
 */
export function isNameForm(property: SchemaProperty): boolean {
    const words = identifierTokens(property.name, { lettersOnly: true });
    return words.length > 1 && semanticRules().codeTexts.textSuffixes.has(words[words.length - 1]);
}

/**
 * Whether a string sibling holds the text of a code by its name alone: the code's name followed by one text
 * word, and room for more than the code. The code's name marks where the text word begins.
 *
 * @param code candidate code
 * @param text candidate text
 * @returns true when the sibling is the code's text
 */
function isTextSibling(code: SchemaProperty, text: SchemaProperty): boolean {
    const codeName = compactName(code.name);
    const textName = compactName(text.name);
    return (
        textName.startsWith(codeName) &&
        semanticRules().codeTexts.textSuffixes.has(textName.slice(codeName.length)) &&
        (text.maxLength === undefined || code.maxLength === undefined || text.maxLength > code.maxLength)
    );
}

const pairCache = new WeakMap<SchemaEntity, ReadonlyArray<CodeTextPair>>();

/**
 * The codes of an entity and the fields holding their texts: the string field a `Common.Text` or `sap:text`
 * annotation of a string or integer code names, or else a string sibling named as a string code followed by
 * a text word.
 *
 * @param entity the entity
 * @returns the pairs, at most one per code
 */
export function codeTextPairs(entity: SchemaEntity): ReadonlyArray<CodeTextPair> {
    const cached = pairCache.get(entity);
    if (cached) {
        return cached;
    }
    const strings = entity.properties.filter(({ primitiveType }) => primitiveType === 'string');
    const byName = new Map(strings.map((property) => [property.name, property]));
    const pairs: CodeTextPair[] = [];
    for (const code of entity.properties) {
        const linked = code.links?.text === undefined ? undefined : byName.get(code.links.text);
        const sibling =
            code.primitiveType !== 'string' || isNameForm(code)
                ? undefined
                : strings.find((candidate) => candidate !== code && isTextSibling(code, candidate));
        const text = CODE_TYPES.has(code.primitiveType) ? (linked ?? sibling) : undefined;
        if (text && text !== code && !text.isKey) {
            pairs.push({ code, text });
        }
    }
    const frozen = Object.freeze(pairs);
    pairCache.set(entity, frozen);
    return frozen;
}

const codeFormCache = new WeakMap<SchemaEntity, ReadonlySet<string>>();

/**
 * The fields of an entity whose values are codes by their metadata: a declared text, a value list or value
 * help in any form, or a text sibling.
 *
 * @param entity the entity
 * @returns the names of the code fields
 */
export function codeFormProperties(entity: SchemaEntity): ReadonlySet<string> {
    const cached = codeFormCache.get(entity);
    if (cached) {
        return cached;
    }
    const names = new Set(codeTextPairs(entity).map(({ code }) => code.name));
    for (const property of entity.properties) {
        if (
            property.links?.valueListCollection !== undefined ||
            property.valueHelp === true ||
            property.annotations.some(({ term }) =>
                VALUE_HELP_TERM_SUFFIXES.some((suffix) => term.toLowerCase().endsWith(suffix))
            )
        ) {
            names.add(property.name);
        }
    }
    codeFormCache.set(entity, names);
    return names;
}

/**
 * Whether a field is the code of a value list: some field of the service takes its values from the
 * field's entity set through it.
 *
 * @param graph service schema
 * @param entity the field's entity
 * @param code the field
 * @returns true for a value-list code
 */
function isValueListCode(graph: SchemaGraph, entity: SchemaEntity, code: SchemaProperty): boolean {
    return graph.entities.some((owner) =>
        owner.properties.some(
            (field) =>
                field.links?.valueListCollection === entity.entitySetName &&
                ((field.links.valueListMappings ?? []).some(
                    ({ valueListProperty }) => valueListProperty === code.name
                ) ||
                    effectiveValueListParameters(field).some(
                        ({ valueListProperty }) => valueListProperty === code.name
                    ))
        )
    );
}

/**
 * The names of the fields of an entity that hold the text naming one of its codes. A number or the
 * entity's own key identifies the row, and its text describes the row itself, so it counts only when the
 * code is a string and, for a key, when the entity is a value list.
 *
 * @param graph service schema
 * @param entity the entity
 * @returns the text field names
 */
export function textOfCodeProperties(graph: SchemaGraph, entity: SchemaEntity): ReadonlySet<string> {
    return new Set(
        codeTextPairs(entity)
            .filter(
                ({ code }) => code.primitiveType === 'string' && (!code.isKey || isValueListCode(graph, entity, code))
            )
            .map(({ text }) => text.name)
    );
}

/**
 * The domain a code belongs to across the service: the value list it comes from, the value list it is the
 * code of, or else the code field of its own entity.
 *
 * @param graph service schema
 * @param entity the code's entity
 * @param code the code
 * @returns the domain key
 */
function codeDomain(graph: SchemaGraph, entity: SchemaEntity, code: SchemaProperty): string {
    if (code.links?.valueListCollection !== undefined) {
        return `list:${code.links.valueListCollection}`;
    }
    return isValueListCode(graph, entity, code)
        ? `list:${entity.entitySetName}`
        : `field:${entity.entitySetName}.${code.name}`;
}

/**
 * The name the rule store's record-name source gives a code of a code role: the host's ICU display name
 * of a region, currency or language, or the text of a unit in the units bank.
 *
 * @param role the code's planned role
 * @param code the code
 * @param locale display locale
 * @returns the name, or undefined when the role has no source or the source does not know the code
 */
function recordName(role: string | undefined, code: string, locale: string): string | undefined {
    const source = role === undefined ? undefined : semanticRules().codeTexts.recordNames.get(role);
    const name =
        source === 'unit'
            ? packagedBanks().unitSamples.find((unit) => unit.code === code || unit.iso === code)?.text
            : source && displayName(locale, source, code);
    return name && name.toUpperCase() !== code.toUpperCase() ? name : undefined;
}

/**
 * A code value as the key of its texts: a non-empty string or a finite number, in its string form.
 *
 * @param value cell value
 * @returns the key, or undefined when the cell holds no code
 */
function codeKey(value: JsonValue | undefined): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Whether a value can serve as the text of a code: words, not the code itself.
 *
 * @param value candidate text
 * @param code the code value
 * @returns true when usable
 */
function isUsableText(value: JsonValue | undefined, code: string): value is string {
    const letters = semanticRules().codeTexts.minimumTextLetters;
    return (
        typeof value === 'string' &&
        new RegExp(`\\p{L}{${letters},}`, 'u').test(value) &&
        value.trim().toUpperCase() !== code.toUpperCase()
    );
}

/** What reconciling the texts of codes reads. */
export interface CodeTextReconciliation {
    graph: SchemaGraph;
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    existingData: Readonly<Record<string, ExistingMockData>>;
    /** Planned roles by `EntitySet.Property`. */
    classifications: ReadonlyMap<string, SemanticClassification>;
    /** Display locale of record names; English by default. */
    locale?: string;
    /** Properties whose values another entity supplied, by entity set: never written, read as given. */
    projectedProperties?: ReadonlyMap<string, ReadonlySet<string>>;
}

/** The rows after reconciliation and the properties whose values were written. */
export interface CodeTextResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    written: ReadonlyMap<string, ReadonlySet<string>>;
    /** The written properties that took a text a supplied row, a fixed cell or a record names, by entity set. */
    named: ReadonlyMap<string, ReadonlySet<string>>;
}

/** The texts of codes by domain and code, and the domain-and-code keys a fixed text or a record named. */
interface KnownTexts {
    texts: Map<string, Map<string, string>>;
    named: Set<string>;
}

/**
 * The key of a code of a domain in `KnownTexts.named`.
 *
 * @param domain the code's domain
 * @param code the code
 * @returns the key
 */
function namedKey(domain: string, code: string): string {
    return `${domain}\u0000${code}`;
}

interface PairSite {
    entity: SchemaEntity;
    pair: CodeTextPair;
    domain: string;
    rows: ReadonlyArray<MockDataRow>;
    /** Per row, whether generation may write its text. */
    writable: ReadonlyArray<boolean>;
}

/**
 * Every code/text pair of the service with its domain and the rows whose text may be written.
 *
 * @param input the reconciliation
 * @returns the pair sites
 */
function pairSites(input: CodeTextReconciliation): PairSite[] {
    const { graph, resources, existingData, projectedProperties } = input;
    const sites: PairSite[] = [];
    for (const entity of graph.entities) {
        const rows = resources[entity.entitySetName];
        if (!rows || entity.codeList !== undefined) {
            continue;
        }
        const fixed = protectedPropertyNames(graph, entity);
        projectedProperties?.get(entity.entitySetName)?.forEach((name) => fixed.add(name));
        const generated = generatedRowFlags(entity, rows, existingData);
        for (const pair of codeTextPairs(entity)) {
            const writable = generated.map((isGenerated) => isGenerated && !fixed.has(pair.text.name));
            sites.push({ entity, pair, domain: codeDomain(graph, entity, pair.code), rows, writable });
        }
    }
    return sites;
}

/**
 * Texts the caller or another entity fixed, by domain and code: supplied rows first, then cells generation
 * may not write.
 *
 * @param input the reconciliation
 * @param sites the pair sites
 * @returns texts by domain and code
 */
function fixedTexts(input: CodeTextReconciliation, sites: ReadonlyArray<PairSite>): KnownTexts {
    const texts = new Map<string, Map<string, string>>();
    const named = new Set<string>();
    const remember = (domain: string, value: JsonValue | undefined, text: JsonValue | undefined): void => {
        const code = codeKey(value);
        if (code === undefined || !isUsableText(text, code)) {
            return;
        }
        const domainTexts = texts.get(domain) ?? new Map<string, string>();
        if (!domainTexts.has(code)) {
            domainTexts.set(code, text);
            named.add(namedKey(domain, code));
        }
        texts.set(domain, domainTexts);
    };
    for (const { entity, pair, domain } of sites) {
        authoredRows(input.existingData[entity.entitySetName]).forEach((row) =>
            remember(domain, row[pair.code.name], row[pair.text.name])
        );
    }
    for (const { pair, domain, rows, writable } of sites) {
        rows.forEach((row, index) => {
            if (!writable[index]) {
                remember(domain, row[pair.code.name], row[pair.text.name]);
            }
        });
    }
    return { texts, named };
}

/** Where a code's text may come from: the text for one code in one row of a pair, if the source has one. */
type TextSource = (site: PairSite, row: MockDataRow, code: string) => string | undefined;

/**
 * Name every code no text names yet from one source, in row order, so the first row of a code decides.
 *
 * @param sites the pair sites
 * @param known texts by domain and code; completed in place
 * @param source the source
 * @param names whether the source names codes (a record) rather than copying a generated text
 */
function nameFrom(sites: ReadonlyArray<PairSite>, known: KnownTexts, source: TextSource, names: boolean): void {
    const { texts, named } = known;
    for (const site of sites) {
        const domainTexts = texts.get(site.domain) ?? new Map<string, string>();
        texts.set(site.domain, domainTexts);
        for (const row of site.rows) {
            const code = codeKey(row[site.pair.code.name]);
            if (code === undefined || domainTexts.has(code)) {
                continue;
            }
            const text = source(site, row, code);
            if (text !== undefined) {
                domainTexts.set(code, text);
                if (names) {
                    named.add(namedKey(site.domain, code));
                }
            }
        }
    }
}

/**
 * The text of every code no fixed text names: its record name or the first generated text of the code. A
 * code neither names keeps what it holds, which is empty unless a tier wrote a value that is no text.
 *
 * @param input the reconciliation
 * @param sites the pair sites
 * @param known fixed texts by domain and code; completed in place
 */
function completeTexts(input: CodeTextReconciliation, sites: ReadonlyArray<PairSite>, known: KnownTexts): void {
    const locale = input.locale ?? 'en';
    const roleOf = (entity: SchemaEntity, property: SchemaProperty): string | undefined =>
        input.classifications.get(semanticPropertyKey(entity.entitySetName, property.name))?.role;
    const codeRoleNamedBy = new Map(
        [...semanticRules().codeTexts.nameRoleOf].map(([codeRole, nameRole]) => [nameRole, codeRole])
    );
    // The code's role names its records; a code without one is named as its text's name role says.
    nameFrom(
        sites,
        known,
        ({ entity, pair }, _row, code) => {
            const textRole = roleOf(entity, pair.text);
            return (
                recordName(roleOf(entity, pair.code), code, locale) ??
                recordName(textRole === undefined ? undefined : codeRoleNamedBy.get(textRole), code, locale)
            );
        },
        true
    );
    nameFrom(
        sites,
        known,
        ({ pair }, row, code) => {
            const text = row[pair.text.name];
            return isUsableText(text, code) ? text : undefined;
        },
        false
    );
}

/**
 * The text a field can hold, cut to its maximum length.
 *
 * @param property the text field
 * @param text the text
 * @returns the value, or undefined when the field has no room for a text or rejects it
 */
function fittedText(property: SchemaProperty, text: string): string | undefined {
    if (property.maxLength !== undefined && property.maxLength < semanticRules().codeTexts.minimumTextLetters) {
        return undefined;
    }
    const value =
        property.maxLength === undefined ? text : Array.from(text).slice(0, property.maxLength).join('').trimEnd();
    return propertyValueIsValid(property, value) ? value : undefined;
}

/**
 * Make the text of every code a function of the code across the service. A code's text comes, in order,
 * from rows the caller supplied or cells another entity fixed, from the name a record bank or the host's
 * ICU data gives the code, or from the first text generated for the code. Supplied rows, keys, enumerations,
 * relationship ends and projected cells are never written; a code nothing names keeps what it holds, which
 * is empty unless a tier wrote a value that is no text.
 *
 * @param input the rows, the plan and what is fixed
 * @returns the rows and the properties written, by entity set
 * @example
 * const { resources } = reconcileCodeTexts({ graph, resources, existingData, classifications });
 */
export function reconcileCodeTexts(input: CodeTextReconciliation): CodeTextResult {
    const sites = pairSites(input);
    const known = fixedTexts(input, sites);
    completeTexts(input, sites, known);
    const output: Record<string, ReadonlyArray<MockDataRow>> = { ...input.resources };
    const written = new Map<string, Set<string>>();
    const named = new Map<string, Set<string>>();
    const add = (target: Map<string, Set<string>>, entity: SchemaEntity, name: string): void => {
        target.set(entity.entitySetName, (target.get(entity.entitySetName) ?? new Set()).add(name));
    };
    for (const { entity, pair, domain, writable } of sites) {
        const domainTexts = known.texts.get(domain);
        const rows = output[entity.entitySetName] ?? [];
        let changed = false;
        const next = rows.map((row, index) => {
            const code = codeKey(row[pair.code.name]);
            const text = code === undefined ? undefined : domainTexts?.get(code);
            const value = writable[index] && text !== undefined ? fittedText(pair.text, text) : undefined;
            if (code === undefined || value === undefined || value === row[pair.text.name]) {
                return row;
            }
            changed = true;
            if (known.named.has(namedKey(domain, code))) {
                add(named, entity, pair.text.name);
            }
            return Object.freeze({ ...row, [pair.text.name]: value });
        });
        if (changed) {
            output[entity.entitySetName] = Object.freeze(next);
            add(written, entity, pair.text.name);
        }
    }
    return { resources: Object.freeze(output), written, named };
}
