import { PRIMITIVE_TYPES, type PrimitiveType } from '../schema/graph.js';
import { assertKeys, nonEmptyString, nonEmptyStrings, objectRecord } from './strict-json.js';
import { errorMessage } from '../guards.js';
import { loadDomainResource } from './resource-integrity.js';
import { lazy } from '../lazy.js';

/**
 * The semantic rule store, `resources/rules/semantic-rules.v1.json`: the vocabulary and heuristics the
 * generator applies to field names, kept as reviewable data rather than code. It holds:
 *
 * - `sapAbbreviations`: SAP naming abbreviations; those marked `appliedInLexicalRules` are expanded
 *   when a field name is tokenized for the lexical rules, so the rules name the full word.
 * - `lexicalRules`: the ordered name rules of the lexical fallback; the first matching rule wins.
 * - `dataElements`: ABAP Dictionary data elements with the role they imply.
 * - `temporalVocabulary`, `coherenceVocabulary` and `vdmFieldGroups`: the words and field-name profiles
 *   of the temporal plan and the cross-field coherence rules.
 * - `rolePolicy` and `thresholds`: runtime routing policy and uncalibrated fallback thresholds.
 *
 * `resources/rules/semantic-rules.schema.json` documents the format for reviewers; this parser is the
 * authority. The package manifest declares the store's SHA-256, verified when a generator is created.
 */
export const SEMANTIC_RULE_STORE_ID = 'mockgen-semantic-rules';
export const SEMANTIC_RULE_STORE_PATH = 'resources/rules/semantic-rules.v1.json';

const PRIMITIVE_TYPE_NAMES: ReadonlySet<string> = new Set(PRIMITIVE_TYPES);

/**
 * Whether a declared type name is one of the schema's primitive types.
 *
 * @param type the declared name
 * @returns true for a primitive type
 */
function isPrimitiveType(type: string): type is PrimitiveType {
    return PRIMITIVE_TYPE_NAMES.has(type);
}

/** A rule that matches the words of a field name: every `all` group, no `none` word, the type and last word. */
export interface WordLexicalRule {
    readonly kind: 'words';
    readonly role: string;
    /** Each group needs at least one of its words; `any` in the resource is one more group. */
    readonly all: ReadonlyArray<ReadonlySet<string>>;
    readonly none: ReadonlySet<string>;
    readonly primitiveTypes?: ReadonlySet<PrimitiveType>;
    readonly lastWord?: ReadonlySet<string>;
    /** Whether the groups of `all` must match consecutive words of the name, in order. */
    readonly adjacent?: boolean;
}

/** A rule whose role is the first of its words that the field name uses, in name order. */
export interface FirstWordLexicalRule {
    readonly kind: 'first-word';
    readonly words: ReadonlySet<string>;
}

export type LexicalRule = WordLexicalRule | FirstWordLexicalRule;

export interface SapAbbreviation {
    readonly abbreviation: string;
    readonly word: string;
    readonly appliedInLexicalRules: boolean;
    readonly notes: string;
}

export interface DataElementRole {
    readonly dataElement: string;
    readonly role: string;
    readonly source: string;
    readonly review?: string;
}

export interface MetadataRoles {
    /** Lower-case qualified-name suffixes of vocabulary terms and their roles; the first match wins. */
    readonly vocabularyTerms: ReadonlyArray<Readonly<{ termSuffix: string; term: string; role: string }>>;
    /** Role by lower-case V2 `sap:semantics` value. */
    readonly sapSemantics: ReadonlyMap<string, string>;
}

export interface TemporalVocabulary {
    readonly created: ReadonlySet<string>;
    readonly changed: ReadonlySet<string>;
    readonly start: ReadonlySet<string>;
    readonly end: ReadonlySet<string>;
    readonly datePairStart: ReadonlySet<string>;
    readonly datePairEnd: ReadonlySet<string>;
    readonly datePairAnchor: ReadonlySet<string>;
    /** Words naming the time of an event; a field's name without them names the event. */
    readonly clock: ReadonlySet<string>;
}

/** When the realism guard withholds a generated value that echoes a name of the service with a number. */
export interface RealismGuardParameters {
    /** An echoed name of at least this many words is withheld wherever it occurs. */
    readonly minimumEchoedWords: number;
    /** A shorter echoed name is withheld when its column counts it up with at least this many numbers. */
    readonly minimumCountedNumbers: number;
}

/** Vocabulary and thresholds of the realism checks, kept apart from the generator's own vocabularies. */
export interface RealismCheckRules {
    readonly textFormWords: ReadonlySet<string>;
    readonly identifierFormWords: ReadonlySet<string>;
    /** As the last word of a field name, these make the field hold text, never codes. */
    readonly textFieldWords: ReadonlySet<string>;
    readonly countryWords: ReadonlySet<string>;
    readonly timeWords: ReadonlySet<string>;
    readonly clockWords: ReadonlySet<string>;
    readonly qualifierWords: ReadonlySet<string>;
    /** Event words of the ordered pairs: created before changed, from before to. */
    readonly eventWords: Readonly<Record<'created' | 'changed' | 'from' | 'to', ReadonlySet<string>>>;
    readonly codeShare: number;
    readonly kindShare: number;
    readonly cityShare: number;
    readonly maximumCodeLength: number;
    readonly minimumPatternRows: number;
    readonly minimumSharedWords: number;
    readonly minimumSharedValues: number;
    readonly minimumEchoedWords: number;
    readonly minimumCountedNumbers: number;
}

/** The typed floor of strings: how many codes a code field holds. */
export interface TypedFloor {
    /** A metadata code field draws its codes from this many ordinals. */
    readonly codeOrdinals: number;
}

/** How far the later event of an ordered pair lies after the earlier one when generation wrote one instant. */
export interface TemporalSpread {
    /** One row in this many keeps both events at one instant. */
    readonly unchangedOneIn: number;
    /** The mean of the exponentially distributed gap, in days. */
    readonly meanGapDays: number;
    /** The longest gap, in days. */
    readonly maximumGapDays: number;
    /** The time of day moves by a uniform number of minutes in this range. */
    readonly gapMinutes: Readonly<{ minimum: number; maximum: number }>;
}

/** An inclusive integer range. */
export interface IntegerRange {
    readonly minimum: number;
    readonly maximum: number;
}

/** The ranges values are drawn from where no metadata bounds them: generation parameters, not facts. */
export interface GenerationRanges {
    /** Days an end date lies after its start when both come from the date role banks. */
    readonly endDateGapDays: IntegerRange;
    /** Days a coherence repair moves an end after its start. */
    readonly dateRepairGapDays: IntegerRange;
    /** The house number before a street name. */
    readonly streetNumber: IntegerRange;
    /** Page numbers of a bank statement. */
    readonly bankStatementPage: IntegerRange;
    /** A count held in a string field; the field's length bounds it further. */
    readonly count: IntegerRange;
    /** Decimal places. */
    readonly decimalPlaces: IntegerRange;
    /** The power of ten of a unit dimension. */
    readonly dimensionExponent: IntegerRange;
}

export interface CoherenceVocabulary {
    readonly phone: ReadonlySet<string>;
    readonly phoneContextIgnored: ReadonlySet<string>;
    readonly country: ReadonlySet<string>;
    readonly countryContextIgnored: ReadonlySet<string>;
    readonly countryNameMarkers: ReadonlySet<string>;
    readonly statusMarker: string;
    readonly statusTextSuffix: string;
    readonly fieldControlSuffix: string;
    readonly balance: Readonly<Record<'opening' | 'debit' | 'credit' | 'closing', ReadonlyArray<string>>>;
    readonly currency: ReadonlySet<string>;
    readonly currencyDataElements: ReadonlySet<string>;
    readonly currencySemantics: ReadonlySet<string>;
    readonly currencyContextIgnored: ReadonlySet<string>;
    readonly amount: ReadonlySet<string>;
    readonly amountContextIgnored: ReadonlySet<string>;
}

export interface VdmFieldGroups {
    readonly unitOfMeasure: Readonly<{
        sourceView: string;
        code: string;
        text: string;
        iso: string;
        temperature: string;
        pressure: string;
    }>;
    readonly siUnitConversion: Readonly<{
        sourceView: string;
        unit: string;
        additive: string;
        numerator: string;
        denominator: string;
        exponent: string;
        minimumFields: number;
    }>;
    readonly lifecycle: Readonly<{
        source: string;
        /** Normalized name suffix of each lifecycle flag, by lifecycle role. */
        suffixes: Readonly<Record<string, string>>;
        minimumFields: number;
        /** The consistent combinations of the flags, by lifecycle role. */
        states: ReadonlyArray<Readonly<Record<string, boolean>>>;
    }>;
    readonly processingStatus: Readonly<{
        source: string;
        primaryPostedSuffix: string;
        primaryPostedExcludes: string;
        secondaryPostedSuffix: string;
        interpretedSuffix: string;
    }>;
}

export interface RolePolicy {
    /** Roles a technical field name decides on its own, ahead of label and description evidence. */
    readonly authoritative: ReadonlySet<string>;
    /** Roles never accepted from the lexical fallback alone. */
    readonly lexicalBlocked: ReadonlySet<string>;
    /** Roles whose values are application domains: only authored or scenario values are trusted. */
    readonly applicationDomain: ReadonlySet<string>;
    /** Metadata roles a lexical candidate may refine, to the roles listed. */
    readonly refinableTo: ReadonlyMap<string, ReadonlySet<string>>;
    /** Name words that show a field displays the name of an organisation. */
    readonly organizationNameEvidence: Readonly<{
        subjectWords: ReadonlySet<string>;
        displayWords: ReadonlySet<string>;
    }>;
}

/** The source of the names of a code role's records: the host's ICU display names or the units bank. */
export type RecordNameSource = 'region' | 'currency' | 'language' | 'unit';

/** How codes, the texts of codes and names of codes are told apart, and where a code's name comes from. */
export interface CodeTexts {
    /** Last words of a field name that make it the text or name of a code. */
    readonly textSuffixes: ReadonlySet<string>;
    /** Roles whose values are codes, which a name-form field never keeps. */
    readonly codeRoles: ReadonlySet<string>;
    /** The role that names the values of a code role. */
    readonly nameRoleOf: ReadonlyMap<string, string>;
    /** Where the names of a code role's records come from. */
    readonly recordNames: ReadonlyMap<string, RecordNameSource>;
    /** A text of a code holds a run of at least this many letters, and a field shorter than it holds none. */
    readonly minimumTextLetters: number;
}

/** Which field of a row anchors its place fields, and which roles are place fields. */
export interface Geography {
    /** The role of a country code field, whose value anchors the row's place fields. */
    readonly anchorRole: string;
    /** Roles of the place of the record itself (city, region, telephone, time zone): they follow its country. */
    readonly leafRoles: ReadonlySet<string>;
    /** Roles of another party (a bank): they follow only a country field that shares a context word with them. */
    readonly contextLeafRoles: ReadonlySet<string>;
}

export interface Thresholds {
    readonly route: number;
    readonly conflict: number;
    readonly lexicalConfidence: number;
    readonly statistics: number;
    readonly bestEffort: number;
}

/**
 * Filters for values the fine-tuned model proposes, tested against the normalized value (trimmed, with
 * whitespace collapsed and lower-cased). A field template holds `{fields}` where the escaped alternation of
 * the field's normalized name, label and description goes; {@link fieldFilter} compiles it.
 */
export interface ModelOutputFilters {
    /** A value that repeats the prompt's instruction to return a JSON array. */
    readonly instructionEcho: ReadonlyArray<RegExp>;
    /** Whole values that are placeholders rather than content. */
    readonly placeholderValues: ReadonlySet<string>;
    /** A value that is only a path or a URL. */
    readonly pathOrUrl: RegExp;
    /** A value that instructs what the field's key should contain. */
    readonly fieldInstruction: string;
    /** A value that is the field's name followed by a placeholder word. */
    readonly fieldPlaceholder: string;
    /** A value that is the field's name followed by an ordinal number. */
    readonly fieldOrdinal: string;
}

export interface SemanticRuleStore {
    readonly format: 'mockgen-semantic-rules';
    readonly version: 1;
    readonly sapAbbreviations: ReadonlyArray<SapAbbreviation>;
    /** The applied abbreviations, from abbreviation to word. */
    readonly lexicalAbbreviations: ReadonlyMap<string, string>;
    readonly lexicalRules: ReadonlyArray<LexicalRule>;
    readonly dataElements: ReadonlyArray<DataElementRole>;
    /** Role by upper-case data element. */
    readonly roleByDataElement: ReadonlyMap<string, string>;
    readonly metadataRoles: MetadataRoles;
    readonly temporalVocabulary: TemporalVocabulary;
    readonly coherenceVocabulary: CoherenceVocabulary;
    readonly vdmFieldGroups: VdmFieldGroups;
    readonly modelOutputFilters: ModelOutputFilters;
    readonly codeTexts: CodeTexts;
    readonly geography: Geography;
    readonly temporalSpread: TemporalSpread;
    readonly generationRanges: GenerationRanges;
    readonly typedFloor: TypedFloor;
    readonly realismGuard: RealismGuardParameters;
    readonly realismChecks: RealismCheckRules;
    readonly rolePolicy: RolePolicy;
    readonly thresholds: Thresholds;
}

const STORE_KEYS = new Set([
    'format',
    'version',
    'sapAbbreviations',
    'lexicalRules',
    'dataElements',
    'metadataRoles',
    'temporalVocabulary',
    'coherenceVocabulary',
    'vdmFieldGroups',
    'modelOutputFilters',
    'codeTexts',
    'geography',
    'temporalSpread',
    'generationRanges',
    'typedFloor',
    'realismGuard',
    'realismChecks',
    'rolePolicy',
    'thresholds'
]);
const LOWER_CASE_WORD = /^[a-z0-9]+$/u;
const ROLE_NAME = /^[a-z][a-z0-9_]*$/u;

/**
 * A frozen set of lower-case words.
 *
 * @param value candidate list
 * @param label what the list is, for the error message
 * @returns the set
 */
function wordSet(value: unknown, label: string): ReadonlySet<string> {
    const words = nonEmptyStrings(value, label);
    if (words.some((word) => !LOWER_CASE_WORD.test(word))) {
        throw new TypeError(`${label} must hold lower-case words`);
    }
    if (new Set(words).size !== words.length) {
        throw new TypeError(`${label} must not repeat a word`);
    }
    return new Set(words);
}

/**
 * A role name in the registry's snake-case spelling.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the role
 */
function roleName(value: unknown, label: string): string {
    const role = nonEmptyString(value, label);
    if (!ROLE_NAME.test(role)) {
        throw new TypeError(`${label} must be a snake-case role name`);
    }
    return role;
}

/**
 * A number in the closed unit interval.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the number
 */
function unitInterval(value: unknown, label: string): number {
    if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
        throw new TypeError(`${label} must be a number from 0 to 1`);
    }
    return value;
}

/**
 * A positive integer.
 *
 * @param value candidate value
 * @param label what the value is, for the error message
 * @returns the integer
 */
function positiveInteger(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
        throw new TypeError(`${label} must be a positive integer`);
    }
    return value;
}

/**
 * The SAP abbreviation glossary; an abbreviation appears once and is never a word of its own glossary.
 *
 * @param value candidate list
 * @returns the frozen glossary
 */
function parseAbbreviations(value: unknown): ReadonlyArray<SapAbbreviation> {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError('sapAbbreviations must be a non-empty list');
    }
    const entries = value.map((entry: unknown, index) => {
        const label = `sapAbbreviations[${index}]`;
        const input = objectRecord(entry, label);
        assertKeys(input, new Set(['abbreviation', 'word', 'appliedInLexicalRules', 'notes']), label);
        const [abbreviation] = wordSet([input.abbreviation], `${label}.abbreviation`);
        const [word] = wordSet([input.word], `${label}.word`);
        if (typeof input.appliedInLexicalRules !== 'boolean') {
            throw new TypeError(`${label}.appliedInLexicalRules must be a boolean`);
        }
        return Object.freeze({
            abbreviation,
            word,
            appliedInLexicalRules: input.appliedInLexicalRules,
            notes: nonEmptyString(input.notes, `${label}.notes`)
        });
    });
    const abbreviations = new Set(entries.map(({ abbreviation }) => abbreviation));
    if (abbreviations.size !== entries.length) {
        throw new TypeError('sapAbbreviations must not repeat an abbreviation');
    }
    if (entries.some(({ word }) => abbreviations.has(word))) {
        throw new TypeError('sapAbbreviations must not expand to another abbreviation');
    }
    return Object.freeze(entries);
}

/**
 * One lexical rule: a word rule, or a first-word rule whose role is the word it finds.
 *
 * @param entry candidate rule
 * @param label the rule's position, for the error message
 * @returns the frozen rule
 */
function parseLexicalRule(entry: unknown, label: string): LexicalRule {
    const input = objectRecord(entry, label);
    if ('firstMatchingWord' in input) {
        assertKeys(input, new Set(['firstMatchingWord', 'notes']), label);
        if (input.notes !== undefined) {
            nonEmptyString(input.notes, `${label}.notes`);
        }
        return Object.freeze({
            kind: 'first-word',
            words: wordSet(input.firstMatchingWord, `${label}.firstMatchingWord`)
        });
    }
    assertKeys(
        input,
        new Set(['role', 'all', 'any', 'none', 'primitiveTypes', 'lastWord', 'adjacent', 'notes']),
        label
    );
    if (input.adjacent !== undefined && (typeof input.adjacent !== 'boolean' || input.all === undefined)) {
        throw new TypeError(`${label}.adjacent must be a boolean on a rule with all`);
    }
    const groups: ReadonlySet<string>[] = [];
    if (input.all !== undefined) {
        if (!Array.isArray(input.all) || input.all.length === 0) {
            throw new TypeError(`${label}.all must be a non-empty list`);
        }
        input.all.forEach((group: unknown, index) =>
            groups.push(wordSet(typeof group === 'string' ? [group] : group, `${label}.all[${index}]`))
        );
    }
    if (input.any !== undefined) {
        groups.push(wordSet(input.any, `${label}.any`));
    }
    if (groups.length === 0 && input.lastWord === undefined) {
        throw new TypeError(`${label} needs all, any or lastWord`);
    }
    let primitiveTypes: ReadonlySet<PrimitiveType> | undefined;
    if (input.primitiveTypes !== undefined) {
        const types = nonEmptyStrings(input.primitiveTypes, `${label}.primitiveTypes`);
        if (!types.every(isPrimitiveType)) {
            throw new TypeError(`${label}.primitiveTypes names an unknown primitive type`);
        }
        primitiveTypes = new Set(types);
    }
    if (input.notes !== undefined) {
        nonEmptyString(input.notes, `${label}.notes`);
    }
    return Object.freeze({
        kind: 'words',
        role: roleName(input.role, `${label}.role`),
        all: Object.freeze(groups),
        none: input.none === undefined ? new Set<string>() : wordSet(input.none, `${label}.none`),
        ...(primitiveTypes ? { primitiveTypes } : {}),
        ...(input.lastWord === undefined ? {} : { lastWord: wordSet(input.lastWord, `${label}.lastWord`) }),
        ...(input.adjacent === true ? { adjacent: true } : {})
    });
}

/**
 * The ordered lexical rules; no rule may name an abbreviation that tokenization expands, since it
 * could never match.
 *
 * @param value candidate list
 * @param applied the abbreviations tokenization expands
 * @returns the frozen rules
 */
function parseLexicalRules(value: unknown, applied: ReadonlyMap<string, string>): ReadonlyArray<LexicalRule> {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError('lexicalRules must be a non-empty list');
    }
    const rules = value.map((entry: unknown, index) => parseLexicalRule(entry, `lexicalRules[${index}]`));
    rules.forEach((rule, index) => {
        const words =
            rule.kind === 'first-word'
                ? [...rule.words]
                : [...rule.all.flatMap((group) => [...group]), ...rule.none, ...(rule.lastWord ?? [])];
        const unreachable = words.find((word) => applied.has(word));
        if (unreachable) {
            throw new TypeError(`lexicalRules[${index}] names the expanded abbreviation ${unreachable}`);
        }
    });
    return Object.freeze(rules);
}

/**
 * The ABAP Dictionary data elements and their roles; a data element appears once.
 *
 * @param value candidate list
 * @returns the frozen entries
 */
function parseDataElements(value: unknown): ReadonlyArray<DataElementRole> {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError('dataElements must be a non-empty list');
    }
    const entries = value.map((entry: unknown, index) => {
        const label = `dataElements[${index}]`;
        const input = objectRecord(entry, label);
        assertKeys(input, new Set(['dataElement', 'role', 'source', 'review']), label);
        const dataElement = nonEmptyString(input.dataElement, `${label}.dataElement`);
        if (dataElement !== dataElement.toUpperCase()) {
            throw new TypeError(`${label}.dataElement must be upper case`);
        }
        return Object.freeze({
            dataElement,
            role: roleName(input.role, `${label}.role`),
            source: nonEmptyString(input.source, `${label}.source`),
            ...(input.review === undefined ? {} : { review: nonEmptyString(input.review, `${label}.review`) })
        });
    });
    if (new Set(entries.map(({ dataElement }) => dataElement)).size !== entries.length) {
        throw new TypeError('dataElements must not repeat a data element');
    }
    return Object.freeze(entries);
}

/**
 * The roles explicit metadata markers decide.
 *
 * @param value candidate object
 * @returns the frozen roles
 */
function parseMetadataRoles(value: unknown): MetadataRoles {
    const label = 'metadataRoles';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', 'vocabularyTerms', 'sapSemantics']), label);
    nonEmptyString(input.notes, `${label}.notes`);
    const entries = (key: string): ReadonlyArray<Record<string, unknown>> => {
        const list = input[key];
        if (!Array.isArray(list) || list.length === 0) {
            throw new TypeError(`${label}.${key} must be a non-empty list`);
        }
        return list.map((entry: unknown, index) => objectRecord(entry, `${label}.${key}[${index}]`));
    };
    const vocabularyTerms = entries('vocabularyTerms').map((entry, index) => {
        const entryLabel = `${label}.vocabularyTerms[${index}]`;
        assertKeys(entry, new Set(['termSuffix', 'term', 'role']), entryLabel);
        const termSuffix = nonEmptyString(entry.termSuffix, `${entryLabel}.termSuffix`);
        if (!/^\.[a-z0-9]+$/u.test(termSuffix)) {
            throw new TypeError(`${entryLabel}.termSuffix must be a dot and a lower-case term name`);
        }
        return Object.freeze({
            termSuffix,
            term: nonEmptyString(entry.term, `${entryLabel}.term`),
            role: roleName(entry.role, `${entryLabel}.role`)
        });
    });
    const sapSemantics = entries('sapSemantics').map((entry, index) => {
        const entryLabel = `${label}.sapSemantics[${index}]`;
        assertKeys(entry, new Set(['value', 'role']), entryLabel);
        const semantics = nonEmptyString(entry.value, `${entryLabel}.value`);
        if (semantics !== semantics.toLowerCase()) {
            throw new TypeError(`${entryLabel}.value must be lower case`);
        }
        return [semantics, roleName(entry.role, `${entryLabel}.role`)] as const;
    });
    if (new Set(sapSemantics.map(([semantics]) => semantics)).size !== sapSemantics.length) {
        throw new TypeError(`${label}.sapSemantics must not repeat a value`);
    }
    return Object.freeze({ vocabularyTerms: Object.freeze(vocabularyTerms), sapSemantics: new Map(sapSemantics) });
}

/**
 * Word sets keyed by name, with an optional `notes` text.
 *
 * @param value candidate object
 * @param label what the object is, for the error message
 * @param names the word sets it must hold
 * @returns the word sets by name
 */
function wordSets<Name extends string>(
    value: unknown,
    label: string,
    names: ReadonlyArray<Name>
): Readonly<Record<Name, ReadonlySet<string>>> {
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', ...names]), label);
    nonEmptyString(input.notes, `${label}.notes`);
    // `Object.fromEntries` cannot type its keys; the entries are exactly `names`.
    return Object.freeze(
        Object.fromEntries(names.map((name) => [name, wordSet(input[name], `${label}.${name}`)])) as Record<
            Name,
            ReadonlySet<string>
        >
    );
}

/**
 * The coherence vocabulary.
 *
 * @param value candidate object
 * @returns the frozen vocabulary
 */
function parseCoherenceVocabulary(value: unknown): CoherenceVocabulary {
    const label = 'coherenceVocabulary';
    const sets = wordSets(
        Object.fromEntries(
            Object.entries(objectRecord(value, label)).filter(
                ([key]) =>
                    ![
                        'statusMarker',
                        'statusTextSuffix',
                        'fieldControlSuffix',
                        'balance',
                        'currencyDataElements',
                        'currencySemantics'
                    ].includes(key)
            )
        ),
        label,
        [
            'phone',
            'phoneContextIgnored',
            'country',
            'countryContextIgnored',
            'countryNameMarkers',
            'currency',
            'currencyContextIgnored',
            'amount',
            'amountContextIgnored'
        ] as const
    );
    const input = objectRecord(value, label);
    const balance = objectRecord(input.balance, `${label}.balance`);
    const balanceRoles = ['opening', 'debit', 'credit', 'closing'] as const;
    assertKeys(balance, new Set(balanceRoles), `${label}.balance`);
    const balanceWords = (role: (typeof balanceRoles)[number]): ReadonlyArray<string> =>
        Object.freeze([...wordSet(balance[role], `${label}.balance.${role}`)]);
    const marker = (key: string): string => [...wordSet([input[key]], `${label}.${key}`)][0];
    const dataElements = nonEmptyStrings(input.currencyDataElements, `${label}.currencyDataElements`);
    if (dataElements.some((dataElement) => dataElement !== dataElement.toUpperCase())) {
        throw new TypeError(`${label}.currencyDataElements must be upper case`);
    }
    return Object.freeze({
        ...sets,
        currencySemantics: new Set(nonEmptyStrings(input.currencySemantics, `${label}.currencySemantics`)),
        statusMarker: marker('statusMarker'),
        statusTextSuffix: marker('statusTextSuffix'),
        fieldControlSuffix: marker('fieldControlSuffix'),
        balance: Object.freeze({
            opening: balanceWords('opening'),
            debit: balanceWords('debit'),
            credit: balanceWords('credit'),
            closing: balanceWords('closing')
        }),
        currencyDataElements: new Set(dataElements)
    });
}

/**
 * An object of normalized field names (lower-case words) with a source and optional integer fields.
 *
 * @param value candidate object
 * @param label what the object is, for the error message
 * @param sourceKey the key that names the source
 * @param names the field-name keys
 * @param integers the positive integer keys
 * @returns the validated object
 */
function fieldProfile<Source extends string, Name extends string, Integer extends string = never>(
    value: unknown,
    label: string,
    sourceKey: Source,
    names: ReadonlyArray<Name>,
    integers: ReadonlyArray<Integer> = []
): Record<Source | Name, string> & Record<Integer, number> {
    const input = objectRecord(value, label);
    assertKeys(input, new Set<string>([sourceKey, ...names, ...integers]), label);
    // `Object.fromEntries` cannot type its keys; the entries are exactly the source, `names` and `integers`.
    return Object.fromEntries([
        [sourceKey, nonEmptyString(input[sourceKey], `${label}.${sourceKey}`)],
        ...names.map((name) => [name, [...wordSet([input[name]], `${label}.${name}`)][0]]),
        ...integers.map((name) => [name, positiveInteger(input[name], `${label}.${name}`)])
    ]) as Record<Source | Name, string> & Record<Integer, number>;
}

/**
 * The interface-view field-name profiles of the restored coherence rules.
 *
 * @param value candidate object
 * @returns the frozen profiles
 */
function parseVdmFieldGroups(value: unknown): VdmFieldGroups {
    const label = 'vdmFieldGroups';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', 'unitOfMeasure', 'siUnitConversion', 'lifecycle', 'processingStatus']), label);
    nonEmptyString(input.notes, `${label}.notes`);
    const unitOfMeasure = fieldProfile(input.unitOfMeasure, `${label}.unitOfMeasure`, 'sourceView', [
        'code',
        'text',
        'iso',
        'temperature',
        'pressure'
    ]);
    const siUnitConversion = fieldProfile(
        input.siUnitConversion,
        `${label}.siUnitConversion`,
        'sourceView',
        ['unit', 'additive', 'numerator', 'denominator', 'exponent'],
        ['minimumFields']
    );
    const processingStatus = fieldProfile(input.processingStatus, `${label}.processingStatus`, 'source', [
        'primaryPostedSuffix',
        'primaryPostedExcludes',
        'secondaryPostedSuffix',
        'interpretedSuffix'
    ]);
    const lifecycleLabel = `${label}.lifecycle`;
    const lifecycle = objectRecord(input.lifecycle, lifecycleLabel);
    assertKeys(lifecycle, new Set(['source', 'suffixes', 'minimumFields', 'states']), lifecycleLabel);
    const suffixInput = objectRecord(lifecycle.suffixes, `${lifecycleLabel}.suffixes`);
    const roles = Object.keys(suffixInput);
    if (roles.length === 0) {
        throw new TypeError(`${lifecycleLabel}.suffixes must not be empty`);
    }
    const suffixes = Object.freeze(
        Object.fromEntries(
            roles.map((role) => [role, [...wordSet([suffixInput[role]], `${lifecycleLabel}.suffixes.${role}`)][0]])
        )
    );
    if (!Array.isArray(lifecycle.states) || lifecycle.states.length === 0) {
        throw new TypeError(`${lifecycleLabel}.states must be a non-empty list`);
    }
    const states = lifecycle.states.map((entry: unknown, index) => {
        const stateLabel = `${lifecycleLabel}.states[${index}]`;
        const state = objectRecord(entry, stateLabel);
        assertKeys(state, new Set(roles), stateLabel);
        if (roles.some((role) => typeof state[role] !== 'boolean')) {
            throw new TypeError(`${stateLabel} must give every lifecycle role a boolean`);
        }
        // Every key is a lifecycle role and every role was checked to be a boolean above.
        const flags = Object.entries(state).filter((flag): flag is [string, boolean] => typeof flag[1] === 'boolean');
        return Object.freeze(Object.fromEntries(flags));
    });
    return Object.freeze({
        unitOfMeasure: Object.freeze(unitOfMeasure),
        siUnitConversion: Object.freeze(siUnitConversion),
        lifecycle: Object.freeze({
            source: nonEmptyString(lifecycle.source, `${lifecycleLabel}.source`),
            suffixes,
            minimumFields: positiveInteger(lifecycle.minimumFields, `${lifecycleLabel}.minimumFields`),
            states: Object.freeze(states)
        }),
        processingStatus: Object.freeze(processingStatus)
    });
}

/** The placeholder a field template holds for the field's names. */
const FIELD_NAMES_PLACEHOLDER = '{fields}';
const REGULAR_EXPRESSION_FLAGS = 'u';

/**
 * A regular expression compiled with the `u` flag, or a TypeError naming the pattern.
 *
 * @param value candidate pattern
 * @param label what the pattern is, for the error message
 * @returns the compiled expression
 */
function regularExpression(value: unknown, label: string): RegExp {
    const pattern = nonEmptyString(value, label);
    try {
        return new RegExp(pattern, REGULAR_EXPRESSION_FLAGS);
    } catch (error) {
        throw new TypeError(`${label} is not a valid regular expression: ${errorMessage(error)}`, { cause: error });
    }
}

/**
 * Compile a field template of the model output filters for one field.
 *
 * @param template field template holding `{fields}` once
 * @param fieldNames escaped alternation of the field's normalized names
 * @returns the compiled expression
 * @example
 * fieldFilter(semanticRules().modelOutputFilters.fieldOrdinal, 'city|town').test('city 3'); // true
 */
export function fieldFilter(template: string, fieldNames: string): RegExp {
    // A function replacement inserts the names verbatim; a string one would expand `$&` in them.
    return new RegExp(
        template.replace(FIELD_NAMES_PLACEHOLDER, () => fieldNames),
        REGULAR_EXPRESSION_FLAGS
    );
}

/**
 * A field template: a pattern holding `{fields}` exactly once that compiles once the names are in.
 *
 * @param value candidate template
 * @param label what the template is, for the error message
 * @returns the template
 */
function fieldTemplate(value: unknown, label: string): string {
    const template = nonEmptyString(value, label);
    if (template.split(FIELD_NAMES_PLACEHOLDER).length !== 2) {
        throw new TypeError(`${label} must hold ${FIELD_NAMES_PLACEHOLDER} exactly once`);
    }
    regularExpression(template.replace(FIELD_NAMES_PLACEHOLDER, 'field'), label);
    return template;
}

/**
 * The filters for values the fine-tuned model proposes.
 *
 * @param value candidate object
 * @returns the frozen filters with compiled expressions
 */
function parseModelOutputFilters(value: unknown): ModelOutputFilters {
    const label = 'modelOutputFilters';
    const input = objectRecord(value, label);
    assertKeys(
        input,
        new Set([
            'notes',
            'instructionEcho',
            'placeholderValues',
            'pathOrUrl',
            'fieldInstruction',
            'fieldPlaceholder',
            'fieldOrdinal'
        ]),
        label
    );
    nonEmptyString(input.notes, `${label}.notes`);
    const placeholderValues = nonEmptyStrings(input.placeholderValues, `${label}.placeholderValues`);
    if (
        placeholderValues.some((placeholder) => placeholder !== placeholder.trim().replace(/\s+/gu, ' ').toLowerCase())
    ) {
        throw new TypeError(`${label}.placeholderValues must be lower-case with single spaces`);
    }
    return Object.freeze({
        instructionEcho: Object.freeze(
            nonEmptyStrings(input.instructionEcho, `${label}.instructionEcho`).map((pattern, index) =>
                regularExpression(pattern, `${label}.instructionEcho[${index}]`)
            )
        ),
        placeholderValues: new Set(placeholderValues),
        pathOrUrl: regularExpression(input.pathOrUrl, `${label}.pathOrUrl`),
        fieldInstruction: fieldTemplate(input.fieldInstruction, `${label}.fieldInstruction`),
        fieldPlaceholder: fieldTemplate(input.fieldPlaceholder, `${label}.fieldPlaceholder`),
        fieldOrdinal: fieldTemplate(input.fieldOrdinal, `${label}.fieldOrdinal`)
    });
}

/**
 * Role sets and refinements of the runtime routing policy.
 *
 * @param value candidate object
 * @returns the frozen policy
 */
function parseRolePolicy(value: unknown): RolePolicy {
    const label = 'rolePolicy';
    const input = objectRecord(value, label);
    assertKeys(
        input,
        new Set([
            'notes',
            'authoritative',
            'lexicalBlocked',
            'applicationDomain',
            'organizationNameEvidence',
            'refinableTo'
        ]),
        label
    );
    nonEmptyString(input.notes, `${label}.notes`);
    const roles = (key: string): ReadonlySet<string> =>
        new Set(nonEmptyStrings(input[key], `${label}.${key}`).map((role) => roleName(role, `${label}.${key}`)));
    const refinements = objectRecord(input.refinableTo, `${label}.refinableTo`);
    return Object.freeze({
        authoritative: roles('authoritative'),
        lexicalBlocked: roles('lexicalBlocked'),
        applicationDomain: roles('applicationDomain'),
        organizationNameEvidence: wordSets(input.organizationNameEvidence, `${label}.organizationNameEvidence`, [
            'subjectWords',
            'displayWords'
        ]),
        refinableTo: new Map(
            Object.entries(refinements).map(([role, targets]) => [
                roleName(role, `${label}.refinableTo`),
                new Set(
                    nonEmptyStrings(targets, `${label}.refinableTo.${role}`).map((target) =>
                        roleName(target, `${label}.refinableTo.${role}`)
                    )
                )
            ])
        )
    });
}

/**
 * The code/text vocabulary.
 *
 * @param value candidate object
 * @returns the frozen vocabulary
 */
function parseCodeTexts(value: unknown): CodeTexts {
    const label = 'codeTexts';
    const input = objectRecord(value, label);
    assertKeys(
        input,
        new Set(['notes', 'textSuffixes', 'codeRoles', 'nameRoleOf', 'recordNames', 'minimumTextLetters']),
        label
    );
    nonEmptyString(input.notes, `${label}.notes`);
    const sources: ReadonlySet<string> = new Set<RecordNameSource>(['region', 'currency', 'language', 'unit']);
    const isSource = (source: unknown): source is RecordNameSource => typeof source === 'string' && sources.has(source);
    return Object.freeze({
        textSuffixes: wordSet(input.textSuffixes, `${label}.textSuffixes`),
        codeRoles: new Set(
            nonEmptyStrings(input.codeRoles, `${label}.codeRoles`).map((role) => roleName(role, `${label}.codeRoles`))
        ),
        nameRoleOf: new Map(
            Object.entries(objectRecord(input.nameRoleOf, `${label}.nameRoleOf`)).map(([role, nameRole]) => [
                roleName(role, `${label}.nameRoleOf`),
                roleName(nameRole, `${label}.nameRoleOf.${role}`)
            ])
        ),
        recordNames: new Map(
            Object.entries(objectRecord(input.recordNames, `${label}.recordNames`)).map(([role, source]) => {
                if (!isSource(source)) {
                    throw new TypeError(`${label}.recordNames.${role} must be region, currency, language or unit`);
                }
                return [roleName(role, `${label}.recordNames`), source];
            })
        ),
        minimumTextLetters: positiveInteger(input.minimumTextLetters, `${label}.minimumTextLetters`)
    });
}

/**
 * The realism guard's parameters.
 *
 * @param value candidate object
 * @returns the frozen parameters
 */
function parseRealismGuard(value: unknown): RealismGuardParameters {
    const label = 'realismGuard';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', 'minimumEchoedWords', 'minimumCountedNumbers']), label);
    nonEmptyString(input.notes, `${label}.notes`);
    return Object.freeze({
        minimumEchoedWords: positiveInteger(input.minimumEchoedWords, `${label}.minimumEchoedWords`),
        minimumCountedNumbers: positiveInteger(input.minimumCountedNumbers, `${label}.minimumCountedNumbers`)
    });
}

/**
 * The vocabulary and thresholds of the realism checks.
 *
 * @param value candidate object
 * @returns the frozen rules
 */
function parseRealismChecks(value: unknown): RealismCheckRules {
    const label = 'realismChecks';
    const input = objectRecord(value, label);
    const wordKeys = [
        'textFormWords',
        'identifierFormWords',
        'textFieldWords',
        'countryWords',
        'timeWords',
        'clockWords',
        'qualifierWords'
    ] as const;
    const shareKeys = ['codeShare', 'kindShare', 'cityShare'] as const;
    const countKeys = [
        'maximumCodeLength',
        'minimumPatternRows',
        'minimumSharedWords',
        'minimumSharedValues',
        'minimumEchoedWords',
        'minimumCountedNumbers'
    ] as const;
    assertKeys(input, new Set(['notes', 'eventWords', ...wordKeys, ...shareKeys, ...countKeys]), label);
    nonEmptyString(input.notes, `${label}.notes`);
    const events = objectRecord(input.eventWords, `${label}.eventWords`);
    assertKeys(events, new Set(['created', 'changed', 'from', 'to']), `${label}.eventWords`);
    const words = (key: (typeof wordKeys)[number]): ReadonlySet<string> => wordSet(input[key], `${label}.${key}`);
    const share = (key: (typeof shareKeys)[number]): number => unitInterval(input[key], `${label}.${key}`);
    const count = (key: (typeof countKeys)[number]): number => positiveInteger(input[key], `${label}.${key}`);
    const event = (key: 'created' | 'changed' | 'from' | 'to'): ReadonlySet<string> =>
        wordSet(events[key], `${label}.eventWords.${key}`);
    return Object.freeze({
        textFormWords: words('textFormWords'),
        identifierFormWords: words('identifierFormWords'),
        textFieldWords: words('textFieldWords'),
        countryWords: words('countryWords'),
        timeWords: words('timeWords'),
        clockWords: words('clockWords'),
        qualifierWords: words('qualifierWords'),
        eventWords: Object.freeze({
            created: event('created'),
            changed: event('changed'),
            from: event('from'),
            to: event('to')
        }),
        codeShare: share('codeShare'),
        kindShare: share('kindShare'),
        cityShare: share('cityShare'),
        maximumCodeLength: count('maximumCodeLength'),
        minimumPatternRows: count('minimumPatternRows'),
        minimumSharedWords: count('minimumSharedWords'),
        minimumSharedValues: count('minimumSharedValues'),
        minimumEchoedWords: count('minimumEchoedWords'),
        minimumCountedNumbers: count('minimumCountedNumbers')
    });
}

/**
 * The typed floor of strings.
 *
 * @param value candidate object
 * @returns the frozen parameters
 */
function parseTypedFloor(value: unknown): TypedFloor {
    const label = 'typedFloor';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', 'codeOrdinals']), label);
    nonEmptyString(input.notes, `${label}.notes`);
    return Object.freeze({
        codeOrdinals: positiveInteger(input.codeOrdinals, `${label}.codeOrdinals`)
    });
}

/**
 * The spread of ordered events.
 *
 * @param value candidate object
 * @returns the frozen parameters
 */
function parseTemporalSpread(value: unknown): TemporalSpread {
    const label = 'temporalSpread';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', 'unchangedOneIn', 'meanGapDays', 'maximumGapDays', 'gapMinutes']), label);
    nonEmptyString(input.notes, `${label}.notes`);
    const minutes = objectRecord(input.gapMinutes, `${label}.gapMinutes`);
    assertKeys(minutes, new Set(['minimum', 'maximum']), `${label}.gapMinutes`);
    const gapMinutes = {
        minimum: positiveInteger(minutes.minimum, `${label}.gapMinutes.minimum`),
        maximum: positiveInteger(minutes.maximum, `${label}.gapMinutes.maximum`)
    };
    if (gapMinutes.maximum <= gapMinutes.minimum) {
        throw new TypeError(`${label}.gapMinutes.maximum must exceed the minimum`);
    }
    return Object.freeze({
        unchangedOneIn: positiveInteger(input.unchangedOneIn, `${label}.unchangedOneIn`),
        meanGapDays: positiveInteger(input.meanGapDays, `${label}.meanGapDays`),
        maximumGapDays: positiveInteger(input.maximumGapDays, `${label}.maximumGapDays`),
        gapMinutes: Object.freeze(gapMinutes)
    });
}

const GENERATION_RANGE_KEYS = [
    'endDateGapDays',
    'dateRepairGapDays',
    'streetNumber',
    'bankStatementPage',
    'count',
    'decimalPlaces',
    'dimensionExponent'
] as const;

/**
 * An inclusive integer range whose maximum is not below its minimum.
 *
 * @param value candidate object
 * @param label path for error messages
 * @returns the frozen range
 */
function integerRange(value: unknown, label: string): IntegerRange {
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['minimum', 'maximum']), label);
    const { minimum, maximum } = input;
    if (
        typeof minimum !== 'number' ||
        typeof maximum !== 'number' ||
        !Number.isSafeInteger(minimum) ||
        !Number.isSafeInteger(maximum) ||
        maximum < minimum
    ) {
        throw new TypeError(`${label} must be an integer range whose maximum is not below its minimum`);
    }
    return Object.freeze({ minimum, maximum });
}

/**
 * The generation ranges.
 *
 * @param value candidate object
 * @returns the frozen ranges
 */
function parseGenerationRanges(value: unknown): GenerationRanges {
    const label = 'generationRanges';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', ...GENERATION_RANGE_KEYS]), label);
    nonEmptyString(input.notes, `${label}.notes`);
    const range = (key: (typeof GENERATION_RANGE_KEYS)[number]): IntegerRange =>
        integerRange(input[key], `${label}.${key}`);
    return Object.freeze({
        endDateGapDays: range('endDateGapDays'),
        dateRepairGapDays: range('dateRepairGapDays'),
        streetNumber: range('streetNumber'),
        bankStatementPage: range('bankStatementPage'),
        count: range('count'),
        decimalPlaces: range('decimalPlaces'),
        dimensionExponent: range('dimensionExponent')
    });
}

/**
 * The geography roles.
 *
 * @param value candidate object
 * @returns the frozen roles
 */
function parseGeography(value: unknown): Geography {
    const label = 'geography';
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', 'anchorRole', 'leafRoles', 'contextLeafRoles']), label);
    nonEmptyString(input.notes, `${label}.notes`);
    return Object.freeze({
        anchorRole: roleName(input.anchorRole, `${label}.anchorRole`),
        leafRoles: new Set(
            nonEmptyStrings(input.leafRoles, `${label}.leafRoles`).map((role) => roleName(role, `${label}.leafRoles`))
        ),
        contextLeafRoles: new Set(
            nonEmptyStrings(input.contextLeafRoles, `${label}.contextLeafRoles`).map((role) =>
                roleName(role, `${label}.contextLeafRoles`)
            )
        )
    });
}

/**
 * The fallback thresholds, each a value with notes.
 *
 * @param value candidate object
 * @returns the frozen thresholds
 */
function parseThresholds(value: unknown): Thresholds {
    const label = 'thresholds';
    const names = ['route', 'conflict', 'lexicalConfidence', 'statistics', 'bestEffort'] as const;
    const input = objectRecord(value, label);
    assertKeys(input, new Set(['notes', ...names]), label);
    nonEmptyString(input.notes, `${label}.notes`);
    const threshold = (name: (typeof names)[number]): number => {
        const entry = objectRecord(input[name], `${label}.${name}`);
        assertKeys(entry, new Set(['value', 'notes']), `${label}.${name}`);
        nonEmptyString(entry.notes, `${label}.${name}.notes`);
        return unitInterval(entry.value, `${label}.${name}.value`);
    };
    return Object.freeze({
        route: threshold('route'),
        conflict: threshold('conflict'),
        lexicalConfidence: threshold('lexicalConfidence'),
        statistics: threshold('statistics'),
        bestEffort: threshold('bestEffort')
    });
}

/**
 * Validate a semantic rule store document against its strict schema.
 *
 * @param value parsed JSON document
 * @returns the validated, frozen store
 * @example
 * const store = parseSemanticRuleStore(JSON.parse(readFileSync(SEMANTIC_RULE_STORE_PATH, 'utf8')));
 * store.lexicalRules[0].kind; // 'words'
 */
export function parseSemanticRuleStore(value: unknown): SemanticRuleStore {
    const input = objectRecord(value, 'semantic rule store');
    assertKeys(input, STORE_KEYS, 'semantic rule store');
    if (input.format !== 'mockgen-semantic-rules' || input.version !== 1) {
        throw new TypeError('unsupported semantic rule store format');
    }
    const sapAbbreviations = parseAbbreviations(input.sapAbbreviations);
    const lexicalAbbreviations: ReadonlyMap<string, string> = new Map(
        sapAbbreviations
            .filter(({ appliedInLexicalRules }) => appliedInLexicalRules)
            .map(({ abbreviation, word }) => [abbreviation, word])
    );
    const dataElements = parseDataElements(input.dataElements);
    const eventWords = ['created', 'changed', 'start', 'end'] as const;
    const temporalVocabulary = wordSets(input.temporalVocabulary, 'temporalVocabulary', [
        ...eventWords,
        'datePairStart',
        'datePairEnd',
        'datePairAnchor',
        'clock'
    ] as const);
    return Object.freeze({
        format: 'mockgen-semantic-rules',
        version: 1,
        sapAbbreviations,
        lexicalAbbreviations,
        lexicalRules: parseLexicalRules(input.lexicalRules, lexicalAbbreviations),
        dataElements,
        roleByDataElement: new Map(dataElements.map(({ dataElement, role }) => [dataElement, role])),
        metadataRoles: parseMetadataRoles(input.metadataRoles),
        temporalVocabulary,
        coherenceVocabulary: parseCoherenceVocabulary(input.coherenceVocabulary),
        vdmFieldGroups: parseVdmFieldGroups(input.vdmFieldGroups),
        modelOutputFilters: parseModelOutputFilters(input.modelOutputFilters),
        codeTexts: parseCodeTexts(input.codeTexts),
        geography: parseGeography(input.geography),
        temporalSpread: parseTemporalSpread(input.temporalSpread),
        generationRanges: parseGenerationRanges(input.generationRanges),
        typedFloor: parseTypedFloor(input.typedFloor),
        realismGuard: parseRealismGuard(input.realismGuard),
        realismChecks: parseRealismChecks(input.realismChecks),
        rolePolicy: parseRolePolicy(input.rolePolicy),
        thresholds: parseThresholds(input.thresholds)
    });
}

/**
 * The packaged semantic rule store, read from the domain resource root and validated on first use.
 *
 * @returns the store and the SHA-256 of the exact bytes that were parsed; the package manifest must declare
 * the same digest
 * @throws {MockGenError} `RESOURCE_INTEGRITY` when the store is unreadable, not valid JSON or breaks its format
 */
export const packagedSemanticRules: () => Readonly<{ store: SemanticRuleStore; sha256: string }> = lazy(() => {
    const { value, sha256: digest } = loadDomainResource(
        SEMANTIC_RULE_STORE_PATH,
        'integrity.resourceName.semanticRuleStore',
        parseSemanticRuleStore
    );
    return Object.freeze({ store: value, sha256: digest });
});

/**
 * The packaged semantic rules.
 *
 * @returns the rule store, loaded on first use
 */
export function semanticRules(): SemanticRuleStore {
    return packagedSemanticRules().store;
}
