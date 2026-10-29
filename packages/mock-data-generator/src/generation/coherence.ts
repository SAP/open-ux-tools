import type { JsonValue, MockDataRow, SyntheticCoherenceRule } from '../types.js';
import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import { packagedBanks } from '../semantics/bank-store.js';
import { semanticRules, type CoherenceVocabulary, type VdmFieldGroups } from '../semantics/rule-store.js';
import { lazy } from '../lazy.js';
import { DRAFT_STATE_PROPERTY_NAMES } from '../spec/draft.js';
import { SAP_V2_TERM, VOCABULARY_TERM_SUFFIX } from '../spec/odata.js';
import { propertyValueIsValid } from './constraints.js';
import { identifierTokens } from '../naming.js';

type MutableRow = Record<string, JsonValue>;

/**
 * The coherence vocabulary of the semantic rule store.
 *
 * @returns the phone, country, status, balance and monetary words
 */
function vocabulary(): CoherenceVocabulary {
    return semanticRules().coherenceVocabulary;
}

/**
 * The SAP standard-view field groups of the semantic rule store.
 *
 * @returns the unit, conversion, lifecycle and processing-status profiles
 */
function fieldGroups(): VdmFieldGroups {
    return semanticRules().vdmFieldGroups;
}

/** Exact conversions of the bank units to their SI base unit, for the units the store records one for. */
const siConversionFactors: () => ReadonlyMap<string, Readonly<{ numerator: number; denominator: number }>> = lazy(
    () =>
        new Map(
            packagedBanks().unitSamples.flatMap(({ code, toBaseNumerator, toBaseDenominator }) =>
                toBaseNumerator === undefined || toBaseDenominator === undefined
                    ? []
                    : [[code, { numerator: toBaseNumerator, denominator: toBaseDenominator }] as const]
            )
        )
);
const TEMPORAL_TYPES = new Set<SchemaProperty['primitiveType']>(['date', 'datetime', 'datetimeoffset']);
/** Phone formats of the bank locations, keyed by upper-case country code and country name. */
const phoneFormats: () => ReadonlyMap<string, Readonly<{ prefix: string; subscriberDigits: number }>> = lazy(
    () =>
        new Map(
            packagedBanks().locations.flatMap(({ country, countryName, phonePrefix, phoneSubscriberDigits }) => {
                const format = { prefix: phonePrefix, subscriberDigits: phoneSubscriberDigits };
                return [
                    [country.toUpperCase(), format],
                    [countryName.toUpperCase(), format]
                ] as const;
            })
        )
);

const ALL_COHERENCE_RULES: readonly SyntheticCoherenceRule[] = [
    'temporal',
    'status',
    'units',
    'monetary',
    'balance',
    'conversion',
    'lifecycle',
    'processing-status',
    'country-phone'
];

/**
 * Lowercase name tokens for the coherence vocabulary, which matches capital runs joined to the next
 * word (`ORDERId` is the one token `orderid`).
 *
 * @param value identifier
 * @returns lowercase tokens
 */
function tokens(value: string): ReadonlyArray<string> {
    return identifierTokens(value, { splitAcronyms: false });
}

function normalized(value: string): string {
    return tokens(value).join('');
}

function propertyMap(entity: SchemaEntity): ReadonlyMap<string, SchemaProperty> {
    return new Map(entity.properties.map((property) => [normalized(property.name), property]));
}

interface CountryPhonePair {
    country: SchemaProperty;
    phone: SchemaProperty;
}

function contextualTokens(property: SchemaProperty, ignored: ReadonlySet<string>): ReadonlySet<string> {
    return new Set(tokens(property.name).filter((token) => !ignored.has(token)));
}

/**
 * How many context words of its name, and of its entity's name when given, a phone or place field shares
 * with a country field (`Payee` of `PayeePhone` and `PayeeCountry`, or of a payee entity's `Phone`).
 *
 * @param field the phone or place field
 * @param country the country field
 * @param entityName the name of the field's entity, whose words also give the field its context
 * @returns the number of shared context words
 */
export function sharedContext(field: SchemaProperty, country: SchemaProperty, entityName?: string): number {
    const fieldContext = new Set([
        ...contextualTokens(field, vocabulary().phoneContextIgnored),
        ...(entityName === undefined ? [] : tokens(entityName))
    ]);
    return [...contextualTokens(country, vocabulary().countryContextIgnored)].filter((token) => fieldContext.has(token))
        .length;
}

/**
 * The country field a phone or place field belongs to: the only one, else the one sharing the most name
 * words with it (`PayeeCountry` for `PayeePhone`), else the field named only as a country.
 *
 * @param field the phone or place field
 * @param countries the entity's country fields
 * @returns the country field, or undefined when none matches
 */
export function matchingCountry(
    field: SchemaProperty,
    countries: ReadonlyArray<SchemaProperty>
): SchemaProperty | undefined {
    if (countries.length === 1) {
        return countries[0];
    }
    const generic = countries.find((country) => vocabulary().country.has(normalized(country.name)));
    const ranked = countries
        .map((country) => ({ country, score: sharedContext(field, country) }))
        .sort((left, right) => right.score - left.score);
    return ranked[0]?.score > 0 && ranked[0].score > (ranked[1]?.score ?? -1) ? ranked[0].country : generic;
}

/**
 * Whether a field holds a country code by its name: a string named with a country word and no name word.
 *
 * @param property the field
 * @returns true for a country code field
 */
export function isCountryCodeField(property: SchemaProperty): boolean {
    return (
        property.primitiveType === 'string' &&
        tokens(property.name).some((token) => vocabulary().country.has(token)) &&
        !tokens(property.name).some((token) => vocabulary().countryNameMarkers.has(token))
    );
}

function countryPhonePairs(entity: SchemaEntity): ReadonlyArray<CountryPhonePair> {
    const countries = entity.properties.filter(isCountryCodeField);
    const phones = entity.properties.filter(
        (property) =>
            property.primitiveType === 'string' && tokens(property.name).some((token) => vocabulary().phone.has(token))
    );
    return phones.flatMap((phone) => {
        const country = matchingCountry(phone, countries);
        return country ? [{ country, phone }] : [];
    });
}

function reconcileCountryPhones(
    rows: ReadonlyArray<MutableRow>,
    pairs: ReadonlyArray<CountryPhonePair>,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    rows.forEach((row, rowIndex) => {
        pairs.forEach(({ country, phone }, phoneIndex) => {
            if (propertyIsProtected(phone, protectedProperties)) {
                return;
            }
            const countryValue = row[country.name];
            const format =
                typeof countryValue === 'string' ? phoneFormats().get(countryValue.trim().toUpperCase()) : undefined;
            if (!format) {
                return;
            }
            const { prefix, subscriberDigits } = format;
            const current = row[phone.name];
            const currentDigits =
                typeof current === 'string' ? current.replace(/\D/gu, '').slice(-subscriberDigits) : '';
            const smallest = 10 ** (subscriberDigits - 1);
            const fallbackDigits = String(
                ((Math.abs(seed) + rowIndex * 1_000_003 + phoneIndex * 97) % (9 * smallest)) + smallest
            );
            setIfValid(
                row,
                phone,
                `${prefix} ${currentDigits.length === subscriberDigits ? currentDigits : fallbackDigits}`
            );
        });
    });
}

function datePairKey(property: SchemaProperty, markers: ReadonlySet<string>): string | undefined {
    if (!TEMPORAL_TYPES.has(property.primitiveType)) {
        return undefined;
    }
    const nameTokens = tokens(property.name);
    if (!nameTokens.some((token) => semanticRules().temporalVocabulary.datePairAnchor.has(token))) {
        return undefined;
    }
    const marker = nameTokens.find((token) => markers.has(token));
    return marker ? nameTokens.filter((token) => token !== marker).join(':') : undefined;
}

export function datePairs(entity: SchemaEntity): ReadonlyArray<readonly [SchemaProperty, SchemaProperty]> {
    const starts = new Map<string, SchemaProperty>();
    const ends = new Map<string, SchemaProperty>();
    for (const property of entity.properties) {
        const startKey = datePairKey(property, semanticRules().temporalVocabulary.datePairStart);
        const endKey = datePairKey(property, semanticRules().temporalVocabulary.datePairEnd);
        if (startKey) {
            starts.set(startKey, property);
        }
        if (endKey) {
            ends.set(endKey, property);
        }
    }
    return [...starts].flatMap(([key, start]) => {
        const end = ends.get(key);
        return end ? [[start, end] as const] : [];
    });
}

function statusPairs(entity: SchemaEntity): ReadonlyArray<readonly [SchemaProperty, SchemaProperty]> {
    const properties = propertyMap(entity);
    return entity.properties.flatMap((code) => {
        const base = normalized(code.name);
        if (
            !base.includes(vocabulary().statusMarker) ||
            base.endsWith(vocabulary().statusTextSuffix) ||
            code.primitiveType !== 'string'
        ) {
            return [];
        }
        const text = properties.get(`${base}${vocabulary().statusTextSuffix}`);
        return text?.primitiveType === 'string' ? [[code, text] as const] : [];
    });
}

interface UnitGroup {
    code: SchemaProperty;
    text: SchemaProperty;
    iso: SchemaProperty;
    temperature?: SchemaProperty;
    pressure?: SchemaProperty;
}

function unitGroup(entity: SchemaEntity): UnitGroup | undefined {
    const properties = propertyMap(entity);
    const code = properties.get(fieldGroups().unitOfMeasure.code);
    const text = properties.get(fieldGroups().unitOfMeasure.text);
    const iso = properties.get(fieldGroups().unitOfMeasure.iso);
    const temperature = properties.get(fieldGroups().unitOfMeasure.temperature);
    const pressure = properties.get(fieldGroups().unitOfMeasure.pressure);
    return code?.primitiveType === 'string' && text?.primitiveType === 'string' && iso?.primitiveType === 'string'
        ? { code, text, iso, temperature, pressure }
        : undefined;
}

/**
 * The four amounts of a statement balance. The rule uses the account holder's bank-statement convention,
 * closing = opening + credit - debit: credits (incoming payments) raise the balance and debits lower it.
 * A general-ledger asset account uses the opposite sign, so the rule only applies where a scenario opts in.
 */
interface BalanceGroup {
    opening: SchemaProperty;
    debit: SchemaProperty;
    credit: SchemaProperty;
    closing: SchemaProperty;
}

interface MonetaryGroup {
    currency: SchemaProperty;
    amounts: ReadonlyArray<SchemaProperty>;
}

interface ConversionGroup {
    unit?: SchemaProperty;
    additive?: SchemaProperty;
    numerator?: SchemaProperty;
    denominator?: SchemaProperty;
    exponent?: SchemaProperty;
}

function balanceGroup(entity: SchemaEntity): BalanceGroup | undefined {
    const numeric = entity.properties.filter(
        (property) =>
            (property.primitiveType === 'decimal' || property.primitiveType === 'int') &&
            tokens(property.name).at(-1) !== vocabulary().fieldControlSuffix
    );
    const find = (parts: ReadonlyArray<string>): SchemaProperty | undefined =>
        numeric.find((property) => parts.every((part) => normalized(property.name).includes(part)));
    const opening = find(vocabulary().balance.opening);
    const debit = find(vocabulary().balance.debit);
    const credit = find(vocabulary().balance.credit);
    const closing = find(vocabulary().balance.closing);
    return opening && debit && credit && closing ? { opening, debit, credit, closing } : undefined;
}

function monetaryGroups(entity: SchemaEntity): ReadonlyArray<MonetaryGroup> {
    const stringProperties = entity.properties.filter((property) => property.primitiveType === 'string');
    const currencies = stringProperties.filter(
        (property) =>
            tokens(property.name).some((token) => vocabulary().currency.has(token)) ||
            (property.dataElement !== undefined &&
                vocabulary().currencyDataElements.has(property.dataElement.toUpperCase())) ||
            property.annotations.some(
                ({ term, value }) =>
                    term.toLowerCase() === SAP_V2_TERM.semantics &&
                    typeof value === 'string' &&
                    vocabulary().currencySemantics.has(value.toLowerCase())
            )
    );
    const currencyAnnotationTarget = (property: SchemaProperty): SchemaProperty | undefined => {
        for (const { term, value } of property.annotations) {
            const normalizedTerm = term.toLowerCase();
            if (
                typeof value !== 'string' ||
                (!normalizedTerm.endsWith(VOCABULARY_TERM_SUFFIX.isoCurrency) && normalizedTerm !== SAP_V2_TERM.unit)
            ) {
                continue;
            }
            const propertyName = value.split('/').at(-1);
            const target = stringProperties.find(({ name }) => name === propertyName);
            if (
                target &&
                (normalizedTerm.endsWith(VOCABULARY_TERM_SUFFIX.isoCurrency) || currencies.includes(target))
            ) {
                return target;
            }
        }
        return undefined;
    };
    const amounts = entity.properties.filter((property) => {
        if (property.primitiveType !== 'decimal' && property.primitiveType !== 'int') {
            return false;
        }
        const nameTokens = tokens(property.name);
        return (
            currencyAnnotationTarget(property) !== undefined ||
            nameTokens.some((token) => vocabulary().amount.has(token))
        );
    });
    const grouped = new Map<string, MonetaryGroup>();
    for (const amount of amounts) {
        const annotationCurrency = currencyAnnotationTarget(amount);
        const contextualCurrency = currencies.find((currency) => {
            const amountContext = contextualTokens(amount, vocabulary().amountContextIgnored);
            const currencyContext = contextualTokens(currency, vocabulary().currencyContextIgnored);
            return [...amountContext].some((token) => currencyContext.has(token));
        });
        const currency =
            annotationCurrency ?? contextualCurrency ?? (currencies.length === 1 ? currencies[0] : undefined);
        if (currency) {
            const group = grouped.get(currency.name) ?? { currency, amounts: [] };
            grouped.set(currency.name, { currency, amounts: [...group.amounts, amount] });
        }
    }
    return [...grouped.values()];
}

function conversionGroup(entity: SchemaEntity): ConversionGroup | undefined {
    const properties = propertyMap(entity);
    const group = {
        unit: properties.get(fieldGroups().siUnitConversion.unit),
        additive: properties.get(fieldGroups().siUnitConversion.additive),
        numerator: properties.get(fieldGroups().siUnitConversion.numerator),
        denominator: properties.get(fieldGroups().siUnitConversion.denominator),
        exponent: properties.get(fieldGroups().siUnitConversion.exponent)
    };
    return Object.values(group).filter(Boolean).length >= fieldGroups().siUnitConversion.minimumFields
        ? group
        : undefined;
}

/** A lifecycle flag's role, such as `available` or `deleted`, as the rule store's lifecycle profile names it. */
type LifecycleRole = string;

function lifecycleGroups(entity: SchemaEntity): ReadonlyArray<Readonly<Record<LifecycleRole, SchemaProperty>>> {
    const groups = new Map<string, Record<LifecycleRole, SchemaProperty>>();
    for (const property of entity.properties) {
        if (property.primitiveType !== 'bool') {
            continue;
        }
        const name = normalized(property.name);
        for (const [role, suffix] of Object.entries(fieldGroups().lifecycle.suffixes)) {
            if (name.endsWith(suffix)) {
                const prefix = name.slice(0, -suffix.length);
                const group = groups.get(prefix) ?? {};
                group[role] = property;
                groups.set(prefix, group);
            }
        }
    }
    return [...groups.values()].filter((group) => Object.keys(group).length >= fieldGroups().lifecycle.minimumFields);
}

interface DraftGroup {
    hasDraft: SchemaProperty;
    hasActive: SchemaProperty;
    isActive: SchemaProperty;
    activeUuid?: SchemaProperty;
}

interface ProcessingStatusGroup {
    primaryPosted: SchemaProperty;
    secondaryPosted: SchemaProperty;
    interpreted: SchemaProperty;
}

function processingStatusGroup(entity: SchemaEntity): ProcessingStatusGroup | undefined {
    const primaryPosted = entity.properties.find(
        (property) =>
            property.primitiveType === 'bool' &&
            normalized(property.name).endsWith(fieldGroups().processingStatus.primaryPostedSuffix) &&
            !normalized(property.name).includes(fieldGroups().processingStatus.primaryPostedExcludes)
    );
    const secondaryPosted = entity.properties.find(
        (property) =>
            property.primitiveType === 'bool' &&
            normalized(property.name).endsWith(fieldGroups().processingStatus.secondaryPostedSuffix)
    );
    const interpreted = entity.properties.find(
        (property) =>
            (property.primitiveType === 'bool' || property.primitiveType === 'string') &&
            normalized(property.name).endsWith(fieldGroups().processingStatus.interpretedSuffix)
    );
    return primaryPosted && secondaryPosted && interpreted
        ? { primaryPosted, secondaryPosted, interpreted }
        : undefined;
}

function draftGroup(entity: SchemaEntity): DraftGroup | undefined {
    const properties = propertyMap(entity);
    const hasDraft = properties.get(DRAFT_STATE_PROPERTY_NAMES.hasDraft);
    const hasActive = properties.get(DRAFT_STATE_PROPERTY_NAMES.hasActive);
    const isActive = properties.get(DRAFT_STATE_PROPERTY_NAMES.isActive);
    const activeUuid = properties.get(DRAFT_STATE_PROPERTY_NAMES.activeUuid);
    return hasDraft?.primitiveType === 'bool' &&
        hasActive?.primitiveType === 'bool' &&
        isActive?.primitiveType === 'bool'
        ? { hasDraft, hasActive, isActive, ...(activeUuid ? { activeUuid } : {}) }
        : undefined;
}

function setIfValid(row: MutableRow, property: SchemaProperty, value: JsonValue): void {
    if (propertyValueIsValid(property, value)) {
        row[property.name] = value;
    }
}

function propertyIsProtected(property: SchemaProperty, protectedProperties: ReadonlySet<string>): boolean {
    return protectedProperties.has(property.name) || property.enumValues !== undefined;
}

function groupIsProtected(
    properties: ReadonlyArray<SchemaProperty>,
    protectedProperties: ReadonlySet<string>
): boolean {
    return properties.some((property) => propertyIsProtected(property, protectedProperties));
}

function reconcileDates(
    row: MutableRow,
    start: SchemaProperty,
    end: SchemaProperty,
    rowIndex: number,
    protectedProperties: ReadonlySet<string>
): void {
    if (groupIsProtected([start, end], protectedProperties)) {
        return;
    }
    const startValue = row[start.name];
    const endValue = row[end.name];
    if (typeof startValue !== 'string' || typeof endValue !== 'string' || startValue <= endValue) {
        return;
    }
    const parsed = new Date(startValue);
    const { minimum, maximum } = semanticRules().generationRanges.dateRepairGapDays;
    parsed.setUTCDate(parsed.getUTCDate() + minimum + (rowIndex % (maximum - minimum + 1)));
    const replacement = end.primitiveType === 'date' ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
    setIfValid(row, end, replacement);
}

/**
 * The words a code spells, capitalised (`IN_PROCESS` gives `In Process`); undefined for a code without letters,
 * whose meaning its characters do not tell.
 *
 * @param code the code
 * @returns the display words, or undefined
 */
function displayText(code: string): string | undefined {
    const parts = tokens(code);
    return parts.length > 0 && parts.some((part) => /[a-z]/iu.test(part))
        ? parts.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ')
        : undefined;
}

/**
 * The text of a status code: the status bank's meaning for a code the bank itself supplied, otherwise the words
 * the code spells, otherwise the code. A code the metadata declared or another source fixed has no meaning the
 * bank could know (`A` may be approved, active or anything else), so the bank never names it.
 *
 * @param code the status code
 * @param property the text field
 * @param fromBank whether the code was drawn from the status bank
 * @returns the text, or undefined when none fits the field
 */
function statusText(code: string, property: SchemaProperty, fromBank: boolean): string | undefined {
    const known = fromBank ? packagedBanks().statusSamples.find((value) => value.code === code)?.text : undefined;
    const candidates = [known, displayText(code), code].filter(
        (candidate): candidate is string => candidate !== undefined
    );
    return candidates.find((candidate) => propertyValueIsValid(property, candidate));
}

function statusDomain(code: SchemaProperty, text: SchemaProperty): ReadonlyArray<readonly [string, string]> {
    const declared = code.enumValues?.filter((value): value is string => typeof value === 'string');
    const fromBank = !declared || declared.length === 0;
    const codes = fromBank ? packagedBanks().statusSamples.map((value) => value.code) : declared;
    return [...new Set(codes)].flatMap((candidate) => {
        const label = statusText(candidate, text, fromBank);
        return propertyValueIsValid(code, candidate) && label ? [[candidate, label] as const] : [];
    });
}

function reconcileStatus(
    rows: ReadonlyArray<MutableRow>,
    code: SchemaProperty,
    text: SchemaProperty,
    seed: number,
    protectedProperties: ReadonlySet<string>
): boolean {
    const values = statusDomain(code, text);
    if (values.length === 0 || propertyIsProtected(text, protectedProperties)) {
        return false;
    }
    const preserveCodes = propertyIsProtected(code, protectedProperties) || (code.isKey && rows.length > values.length);
    rows.forEach((row, rowIndex) => {
        if (preserveCodes) {
            const currentCode = row[code.name];
            const label = typeof currentCode === 'string' ? statusText(currentCode, text, false) : undefined;
            if (label && propertyValueIsValid(code, currentCode)) {
                row[text.name] = label;
            }
            return;
        }
        const [candidateCode, label] = values[(Math.abs(seed) + rowIndex) % values.length];
        row[code.name] = candidateCode;
        row[text.name] = label;
    });
    return true;
}

function unitValue(code: string, group: UnitGroup): Readonly<{ code: string; iso: string; text: string }> | undefined {
    const known = packagedBanks().unitSamples.find((value) => value.code === code);
    const textCandidates = [known?.text, displayText(code), code].filter(
        (candidate): candidate is string => candidate !== undefined
    );
    const isoCandidates = [known?.iso, code].filter((candidate): candidate is string => candidate !== undefined);
    const text = textCandidates.find((candidate) => propertyValueIsValid(group.text, candidate));
    const iso = isoCandidates.find((candidate) => propertyValueIsValid(group.iso, candidate));
    return propertyValueIsValid(group.code, code) && text && iso ? { code, text, iso } : undefined;
}

function unitDomain(group: UnitGroup): ReadonlyArray<Readonly<{ code: string; iso: string; text: string }>> {
    const declared = group.code.enumValues?.filter((value): value is string => typeof value === 'string');
    const codes = declared && declared.length > 0 ? declared : packagedBanks().unitSamples.map((value) => value.code);
    return [...new Set(codes)].flatMap((code) => {
        const value = unitValue(code, group);
        return value ? [value] : [];
    });
}

function reconcileUnits(
    rows: ReadonlyArray<MutableRow>,
    group: UnitGroup,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    const values = unitDomain(group);
    if (
        values.length === 0 ||
        propertyIsProtected(group.text, protectedProperties) ||
        propertyIsProtected(group.iso, protectedProperties)
    ) {
        return;
    }
    const preserveCodes =
        propertyIsProtected(group.code, protectedProperties) || (group.code.isKey && rows.length > values.length);
    rows.forEach((row, rowIndex) => {
        const reconcileDimensionExponents = (): void => {
            if (group.temperature && !propertyIsProtected(group.temperature, protectedProperties)) {
                setIfValid(row, group.temperature, 0);
            }
            if (group.pressure && !propertyIsProtected(group.pressure, protectedProperties)) {
                setIfValid(row, group.pressure, 0);
            }
        };
        if (preserveCodes) {
            const currentCode = row[group.code.name];
            const value = typeof currentCode === 'string' ? unitValue(currentCode, group) : undefined;
            if (value) {
                row[group.text.name] = value.text;
                row[group.iso.name] = value.iso;
            }
            reconcileDimensionExponents();
            return;
        }
        const value = values[(Math.abs(seed) + rowIndex) % values.length];
        row[group.code.name] = value.code;
        row[group.text.name] = value.text;
        row[group.iso.name] = value.iso;
        reconcileDimensionExponents();
    });
}

function rounded(value: number, property: SchemaProperty): number {
    return Number(value.toFixed(property.primitiveType === 'int' ? 0 : (property.scale ?? 2)));
}

interface BalanceTuple {
    opening: number;
    debit: number;
    credit: number;
    closing: number;
}

function balanceTupleIsValid(group: BalanceGroup, tuple: BalanceTuple): boolean {
    return (
        Math.abs(tuple.opening + tuple.credit - tuple.debit - tuple.closing) < 0.000_001 &&
        propertyValueIsValid(group.opening, tuple.opening) &&
        propertyValueIsValid(group.debit, tuple.debit) &&
        propertyValueIsValid(group.credit, tuple.credit) &&
        propertyValueIsValid(group.closing, tuple.closing)
    );
}

function numericCandidates(property: SchemaProperty, preferred: unknown, locked: boolean): ReadonlyArray<number> {
    if (locked) {
        return typeof preferred === 'number' && propertyValueIsValid(property, preferred) ? [preferred] : [];
    }
    const declared = property.enumValues?.filter((value): value is number => typeof value === 'number') ?? [];
    const candidates = [
        typeof preferred === 'number' ? Math.abs(rounded(preferred, property)) : undefined,
        ...declared
    ];
    for (let value = 0; value <= 9; value += 1) {
        candidates.push(value);
    }
    return [...new Set(candidates)].filter(
        (candidate): candidate is number => candidate !== undefined && propertyValueIsValid(property, candidate)
    );
}

function compatibleBalanceTuple(
    row: MutableRow,
    group: BalanceGroup,
    protectedProperties: ReadonlySet<string>
): BalanceTuple | undefined {
    const opening = row[group.opening.name];
    const debit = row[group.debit.name];
    const credit = row[group.credit.name];
    if (typeof opening !== 'number' || typeof debit !== 'number' || typeof credit !== 'number') {
        return undefined;
    }
    const safeOpening = Math.abs(opening);
    const safeCredit = Math.abs(credit);
    const safeDebit = Math.min(Math.abs(debit), safeOpening + safeCredit);
    const preferred = {
        opening: rounded(safeOpening, group.opening),
        credit: rounded(safeCredit, group.credit),
        debit: rounded(safeDebit, group.debit),
        closing: rounded(safeOpening + safeCredit - safeDebit, group.closing)
    };
    if (
        balanceTupleIsValid(group, preferred) &&
        Object.entries(group).every(
            ([role, property]) =>
                !propertyIsProtected(property, protectedProperties) ||
                Reflect.get(preferred, role) === row[property.name]
        )
    ) {
        return preferred;
    }
    const openings = numericCandidates(
        group.opening,
        row[group.opening.name],
        propertyIsProtected(group.opening, protectedProperties)
    );
    const debits = numericCandidates(
        group.debit,
        row[group.debit.name],
        propertyIsProtected(group.debit, protectedProperties)
    );
    const credits = numericCandidates(
        group.credit,
        row[group.credit.name],
        propertyIsProtected(group.credit, protectedProperties)
    );
    for (const candidateOpening of openings) {
        for (const candidateCredit of credits) {
            for (const candidateDebit of debits) {
                const candidateClosing = candidateOpening + candidateCredit - candidateDebit;
                const tuple = {
                    opening: candidateOpening,
                    debit: candidateDebit,
                    credit: candidateCredit,
                    closing: candidateClosing
                };
                if (
                    (!propertyIsProtected(group.closing, protectedProperties) ||
                        candidateClosing === row[group.closing.name]) &&
                    balanceTupleIsValid(group, tuple)
                ) {
                    return tuple;
                }
            }
        }
    }
    return undefined;
}

function reconcileBalance(row: MutableRow, group: BalanceGroup, protectedProperties: ReadonlySet<string>): void {
    const tuple = compatibleBalanceTuple(row, group, protectedProperties);
    if (!tuple) {
        return;
    }
    row[group.opening.name] = tuple.opening;
    row[group.debit.name] = tuple.debit;
    row[group.credit.name] = tuple.credit;
    row[group.closing.name] = tuple.closing;
}

/**
 * The ISO 4217 minor-unit digits of each currency the value-bank store records (List One as published
 * by SIX); a recorded currency without a minor unit (precious metals, testing codes) maps to undefined.
 *
 * @see https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml
 */
const iso4217MinorUnits: () => ReadonlyMap<string, number | undefined> = lazy(
    () => new Map(packagedBanks().iso4217Currencies.map(({ code, minorUnits }) => [code, minorUnits]))
);

/**
 * The ISO 4217 minor-unit digits of a currency: the recorded digits, none for a currency without a minor
 * unit, and two for any code the store does not record.
 *
 * @param currency ISO 4217 alphabetic code
 * @returns the minor-unit digits, or undefined for a currency without a minor unit
 */
export function currencyFractionDigits(currency: string): number | undefined {
    const minorUnits = iso4217MinorUnits();
    return minorUnits.has(currency) ? minorUnits.get(currency) : 2;
}

function reconcileMonetaryGroup(
    rows: ReadonlyArray<MutableRow>,
    group: MonetaryGroup,
    protectedProperties: ReadonlySet<string>
): void {
    rows.forEach((row) => {
        const currency = row[group.currency.name];
        if (typeof currency !== 'string') {
            return;
        }
        const currencyScale = currencyFractionDigits(currency.toUpperCase());
        if (currencyScale === undefined) {
            return;
        }
        group.amounts.forEach((property) => {
            if (propertyIsProtected(property, protectedProperties)) {
                return;
            }
            const value = row[property.name];
            if (typeof value !== 'number') {
                return;
            }
            const propertyScale = property.primitiveType === 'int' ? 0 : (property.scale ?? currencyScale);
            setIfValid(row, property, Number(value.toFixed(Math.min(currencyScale, propertyScale))));
        });
    });
}

function reconcileConversion(
    rows: ReadonlyArray<MutableRow>,
    group: ConversionGroup,
    protectedProperties: ReadonlySet<string>
): void {
    if (
        groupIsProtected(
            Object.values(group).filter((property): property is SchemaProperty => Boolean(property)),
            protectedProperties
        )
    ) {
        return;
    }
    rows.forEach((row) => {
        const unit = group.unit ? row[group.unit.name] : undefined;
        const factor = typeof unit === 'string' ? siConversionFactors().get(unit) : undefined;
        if (group.additive) {
            setIfValid(row, group.additive, 0);
        }
        if (group.numerator) {
            setIfValid(row, group.numerator, factor?.numerator ?? 1);
        }
        if (group.denominator) {
            setIfValid(row, group.denominator, factor?.denominator ?? 1);
        }
        if (group.exponent) {
            setIfValid(row, group.exponent, 0);
        }
    });
}

function reconcileLifecycle(
    rows: ReadonlyArray<MutableRow>,
    group: Readonly<Record<LifecycleRole, SchemaProperty>>,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    if (groupIsProtected(Object.values(group), protectedProperties)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        const states = fieldGroups().lifecycle.states;
        const state = states[(Math.abs(seed) + rowIndex) % states.length];
        for (const [role, property] of Object.entries(group)) {
            setIfValid(row, property, state[role]);
        }
    });
}

function reconcileDraft(
    rows: ReadonlyArray<MutableRow>,
    group: DraftGroup,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    if (groupIsProtected(Object.values(group), protectedProperties)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        const active = (Math.abs(seed) + rowIndex) % 2 === 0;
        setIfValid(row, group.isActive, active);
        setIfValid(row, group.hasActive, !active);
        setIfValid(row, group.hasDraft, false);
        if (group.activeUuid && !active) {
            const current = row[group.activeUuid.name];
            if (!propertyValueIsValid(group.activeUuid, current)) {
                setIfValid(row, group.hasActive, false);
            }
        } else if (group.activeUuid?.nullable) {
            row[group.activeUuid.name] = null;
        }
    });
}

function reconcileProcessingStatus(
    rows: ReadonlyArray<MutableRow>,
    group: ProcessingStatusGroup,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    if (groupIsProtected(Object.values(group), protectedProperties)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        const state = (Math.abs(seed) + rowIndex) % 3;
        const primaryPosted = state > 0;
        const secondaryPosted = state > 1;
        setIfValid(row, group.primaryPosted, primaryPosted);
        setIfValid(row, group.secondaryPosted, secondaryPosted);
        let interpreted: unknown;
        if (group.interpreted.primitiveType === 'bool') {
            interpreted = primaryPosted;
        } else {
            interpreted = primaryPosted ? 'X' : null;
        }
        if (propertyValueIsValid(group.interpreted, interpreted)) {
            row[group.interpreted.name] = interpreted;
        } else {
            setIfValid(row, group.interpreted, '');
        }
    });
}

/**
 * Return fields governed as one cross-field coherence group.
 *
 * @param entity
 * @param rules
 */
export function coherencePropertyNames(
    entity: SchemaEntity,
    rules: readonly SyntheticCoherenceRule[] = ALL_COHERENCE_RULES
): ReadonlySet<string> {
    const names = new Set<string>();
    if (rules.includes('temporal')) {
        datePairs(entity)
            .flat()
            .forEach((property) => names.add(property.name));
    }
    if (rules.includes('status')) {
        statusPairs(entity).forEach(([code, text]) => {
            if (statusDomain(code, text).length > 0) {
                [code, text].forEach((property) => names.add(property.name));
            }
        });
    }
    const units = unitGroup(entity);
    if (units && rules.includes('units') && unitDomain(units).length > 0) {
        Object.values(units).forEach((property) => property && names.add(property.name));
    }
    const balance = balanceGroup(entity);
    if (balance && rules.includes('balance')) {
        Object.values(balance).forEach((property) => names.add(property.name));
    }
    monetaryGroups(entity).forEach(({ currency, amounts }) => {
        const governedAmounts = rules.includes('monetary')
            ? amounts
            : amounts.filter((property) => property.links?.currency === currency.name);
        governedAmounts.forEach((property) => names.add(property.name));
    });
    const conversion = conversionGroup(entity);
    if (conversion && rules.includes('conversion')) {
        Object.values(conversion).forEach((property) => property && names.add(property.name));
    }
    if (rules.includes('lifecycle')) {
        lifecycleGroups(entity).forEach((group) =>
            Object.values(group).forEach((property) => names.add(property.name))
        );
    }
    const draft = draftGroup(entity);
    if (draft) {
        Object.values(draft).forEach((property) => names.add(property.name));
    }
    const processingStatus = processingStatusGroup(entity);
    if (processingStatus && rules.includes('processing-status')) {
        Object.values(processingStatus).forEach((property) => names.add(property.name));
    }
    if (rules.includes('country-phone')) {
        countryPhonePairs(entity).forEach(({ phone }) => names.add(phone.name));
    }
    return names;
}

/**
 * Reconcile conservative, metadata-derived cross-field groups before relationship planning and learned completion.
 *
 * @param entity
 * @param inputRows
 * @param seed
 * @param protectedProperties
 * @param rules
 * @param reconciled receives the properties this pass supplied values for, so the caller can
 * attribute those cells to the coherence rule that wrote them rather than to the typed floor that
 * filled them first.
 */
export function applySemanticCoherence(
    entity: SchemaEntity,
    inputRows: ReadonlyArray<MockDataRow>,
    seed: number,
    protectedProperties: ReadonlySet<string> = new Set(),
    rules: readonly SyntheticCoherenceRule[] = ['temporal'],
    reconciled: Set<string> = new Set()
): ReadonlyArray<MockDataRow> {
    const rows = inputRows.map((row) => ({ ...row }));
    for (const [start, end] of rules.includes('temporal') ? datePairs(entity) : []) {
        rows.forEach((row, rowIndex) => reconcileDates(row, start, end, rowIndex, protectedProperties));
    }
    for (const [code, text] of rules.includes('status') ? statusPairs(entity) : []) {
        if (reconcileStatus(rows, code, text, seed, protectedProperties)) {
            reconciled.add(code.name);
            reconciled.add(text.name);
        }
    }
    const units = unitGroup(entity);
    if (units && rules.includes('units')) {
        reconcileUnits(rows, units, seed, protectedProperties);
    }
    for (const monetaryGroup of monetaryGroups(entity)) {
        const amounts = rules.includes('monetary')
            ? monetaryGroup.amounts
            : monetaryGroup.amounts.filter((property) => property.links?.currency === monetaryGroup.currency.name);
        if (amounts.length > 0) {
            reconcileMonetaryGroup(rows, { ...monetaryGroup, amounts }, protectedProperties);
        }
    }
    const balance = balanceGroup(entity);
    if (balance && rules.includes('balance')) {
        rows.forEach((row) => reconcileBalance(row, balance, protectedProperties));
    }
    const conversion = conversionGroup(entity);
    if (conversion && rules.includes('conversion')) {
        reconcileConversion(rows, conversion, protectedProperties);
    }
    for (const group of rules.includes('lifecycle') ? lifecycleGroups(entity) : []) {
        reconcileLifecycle(rows, group, seed, protectedProperties);
    }
    const draft = draftGroup(entity);
    if (draft) {
        reconcileDraft(rows, draft, seed, protectedProperties);
    }
    const processingStatus = processingStatusGroup(entity);
    if (processingStatus && rules.includes('processing-status')) {
        reconcileProcessingStatus(rows, processingStatus, seed, protectedProperties);
    }
    const countryPhones = countryPhonePairs(entity);
    if (countryPhones.length > 0 && rules.includes('country-phone')) {
        reconcileCountryPhones(rows, countryPhones, seed, protectedProperties);
    }
    return rows;
}
