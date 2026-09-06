import type { JsonValue, MockDataRow } from '../types.js';
import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import { propertyValueIsValid } from './constraints.js';

type MutableRow = Record<string, JsonValue>;

const STATUS_VALUES = [
    { code: 'O', text: 'Open' },
    { code: 'I', text: 'In Progress' },
    { code: 'A', text: 'Approved' },
    { code: 'C', text: 'Completed' }
] as const;

const UNIT_VALUES = [
    { code: 'EA', iso: 'EA', text: 'Each' },
    { code: 'KG', iso: 'KGM', text: 'Kilogram' },
    { code: 'L', iso: 'LTR', text: 'Litre' },
    { code: 'H', iso: 'HUR', text: 'Hour' },
    { code: 'PC', iso: 'PCE', text: 'Piece' },
    { code: 'M', iso: 'MTR', text: 'Metre' },
    { code: 'S', iso: 'SEC', text: 'Second' },
    { code: 'MIN', iso: 'MIN', text: 'Minute' },
    { code: 'D', iso: 'DAY', text: 'Day' },
    { code: 'WK', iso: 'WEE', text: 'Week' }
] as const;

const START_MARKERS = new Set(['start', 'begin', 'from']);
const END_MARKERS = new Set(['end', 'until', 'to']);
const TEMPORAL_TYPES = new Set<SchemaProperty['primitiveType']>(['date', 'datetime', 'datetimeoffset']);
const PHONE_PREFIXES = new Map([
    ['DE', '+49 30'],
    ['GERMANY', '+49 30'],
    ['IE', '+353 1'],
    ['IRELAND', '+353 1'],
    ['IT', '+39 02'],
    ['ITALY', '+39 02'],
    ['CZ', '+420 2'],
    ['CZECHIA', '+420 2']
]);

function tokens(value: string): ReadonlyArray<string> {
    return value
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
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

function matchingCountry(phone: SchemaProperty, countries: ReadonlyArray<SchemaProperty>): SchemaProperty | undefined {
    if (countries.length === 1) {
        return countries[0];
    }
    const generic = countries.find((country) => normalized(country.name) === 'country');
    const phoneContext = contextualTokens(phone, new Set(['phone', 'telephone', 'mobile', 'number']));
    const ranked = countries
        .map((country) => ({
            country,
            score: [...contextualTokens(country, new Set(['country', 'code']))].filter((token) =>
                phoneContext.has(token)
            ).length
        }))
        .sort((left, right) => right.score - left.score);
    return ranked[0]?.score > 0 && ranked[0].score > (ranked[1]?.score ?? -1) ? ranked[0].country : generic;
}

function countryPhonePairs(entity: SchemaEntity): ReadonlyArray<CountryPhonePair> {
    const countries = entity.properties.filter(
        (property) =>
            property.primitiveType === 'string' &&
            tokens(property.name).includes('country') &&
            !tokens(property.name).some((token) => token === 'name' || token === 'text' || token === 'description')
    );
    const phones = entity.properties.filter(
        (property) =>
            property.primitiveType === 'string' &&
            tokens(property.name).some((token) => token === 'phone' || token === 'telephone' || token === 'mobile')
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
            const prefix =
                typeof countryValue === 'string' ? PHONE_PREFIXES.get(countryValue.trim().toUpperCase()) : undefined;
            if (!prefix) {
                return;
            }
            const current = row[phone.name];
            const currentDigits = typeof current === 'string' ? current.replace(/\D/gu, '').slice(-7) : '';
            const fallbackDigits = String(
                ((Math.abs(seed) + rowIndex * 1_000_003 + phoneIndex * 97) % 9_000_000) + 1_000_000
            );
            setIfValid(row, phone, `${prefix} ${currentDigits.length === 7 ? currentDigits : fallbackDigits}`);
        });
    });
}

function datePairKey(property: SchemaProperty, markers: ReadonlySet<string>): string | undefined {
    if (!TEMPORAL_TYPES.has(property.primitiveType)) {
        return undefined;
    }
    const nameTokens = tokens(property.name);
    if (!nameTokens.some((token) => token === 'date' || token === 'time')) {
        return undefined;
    }
    const marker = nameTokens.find((token) => markers.has(token));
    return marker ? nameTokens.filter((token) => token !== marker).join(':') : undefined;
}

function datePairs(entity: SchemaEntity): ReadonlyArray<readonly [SchemaProperty, SchemaProperty]> {
    const starts = new Map<string, SchemaProperty>();
    const ends = new Map<string, SchemaProperty>();
    for (const property of entity.properties) {
        const startKey = datePairKey(property, START_MARKERS);
        const endKey = datePairKey(property, END_MARKERS);
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
        if (!base.includes('status') || base.endsWith('text') || code.primitiveType !== 'string') {
            return [];
        }
        const text = properties.get(`${base}text`);
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
    const code = properties.get('unitofmeasure');
    const text = properties.get('unitofmeasuretext');
    const iso = properties.get('unitofmeasureisocode');
    const temperature = properties.get('unitofmeasuretemperature');
    const pressure = properties.get('unitofmeasurepressure');
    return code?.primitiveType === 'string' && text?.primitiveType === 'string' && iso?.primitiveType === 'string'
        ? { code, text, iso, temperature, pressure }
        : undefined;
}

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
            tokens(property.name).at(-1) !== 'fc'
    );
    const find = (parts: ReadonlyArray<string>): SchemaProperty | undefined =>
        numeric.find((property) => parts.every((part) => normalized(property.name).includes(part)));
    const opening = find(['opening', 'balance']);
    const debit = find(['debit', 'amount']);
    const credit = find(['credit', 'amount']);
    const closing = find(['closing', 'balance']);
    return opening && debit && credit && closing ? { opening, debit, credit, closing } : undefined;
}

function monetaryGroups(entity: SchemaEntity): ReadonlyArray<MonetaryGroup> {
    const stringProperties = entity.properties.filter((property) => property.primitiveType === 'string');
    const currencies = stringProperties.filter(
        (property) =>
            tokens(property.name).some((token) => token === 'currency' || token === 'waers') ||
            property.dataElement?.toUpperCase() === 'WAERS' ||
            property.annotations.some(
                ({ term, value }) =>
                    term.toLowerCase() === 'sap:semantics' &&
                    typeof value === 'string' &&
                    ['currency', 'currency-code', 'iso-currency'].includes(value.toLowerCase())
            )
    );
    const currencyAnnotationTarget = (property: SchemaProperty): SchemaProperty | undefined => {
        for (const { term, value } of property.annotations) {
            const normalizedTerm = term.toLowerCase();
            if (
                typeof value !== 'string' ||
                (!normalizedTerm.endsWith('.isocurrency') && normalizedTerm !== 'sap:unit')
            ) {
                continue;
            }
            const propertyName = value.split('/').at(-1);
            const target = stringProperties.find(({ name }) => name === propertyName);
            if (target && (normalizedTerm.endsWith('.isocurrency') || currencies.includes(target))) {
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
            nameTokens.some((token) => ['amount', 'amt', 'balance', 'price'].includes(token))
        );
    });
    const grouped = new Map<string, MonetaryGroup>();
    for (const amount of amounts) {
        const annotationCurrency = currencyAnnotationTarget(amount);
        const contextualCurrency = currencies.find((currency) => {
            const amountContext = contextualTokens(
                amount,
                new Set(['amount', 'amt', 'balance', 'price', 'net', 'gross'])
            );
            const currencyContext = contextualTokens(currency, new Set(['currency', 'code']));
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
        unit: properties.get('unitofmeasure'),
        additive: properties.get('siunitcnvrsnadditivevalue'),
        numerator: properties.get('siunitcnvrsnratenumerator'),
        denominator: properties.get('siunitcnvrsnratedenominator'),
        exponent: properties.get('siunitcnvrsnrateexponent')
    };
    return Object.values(group).filter(Boolean).length >= 3 ? group : undefined;
}

const LIFECYCLE_SUFFIXES = {
    available: 'isavailable',
    deleted: 'isdeleted',
    inactive: 'isinactive',
    installed: 'isinstalled',
    warehouse: 'isinwarehouse',
    customer: 'isatcustomer'
} as const;

type LifecycleRole = keyof typeof LIFECYCLE_SUFFIXES;

function lifecycleGroups(
    entity: SchemaEntity
): ReadonlyArray<Readonly<Partial<Record<LifecycleRole, SchemaProperty>>>> {
    const groups = new Map<string, Partial<Record<LifecycleRole, SchemaProperty>>>();
    for (const property of entity.properties) {
        if (property.primitiveType !== 'bool') {
            continue;
        }
        const name = normalized(property.name);
        for (const [role, suffix] of Object.entries(LIFECYCLE_SUFFIXES) as Array<[LifecycleRole, string]>) {
            if (name.endsWith(suffix)) {
                const prefix = name.slice(0, -suffix.length);
                const group = groups.get(prefix) ?? {};
                group[role] = property;
                groups.set(prefix, group);
            }
        }
    }
    return [...groups.values()].filter((group) => Object.keys(group).length >= 3);
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
            normalized(property.name).endsWith('isposted') &&
            !normalized(property.name).includes('subledger')
    );
    const secondaryPosted = entity.properties.find(
        (property) => property.primitiveType === 'bool' && normalized(property.name).endsWith('ispostedsuccessfully')
    );
    const interpreted = entity.properties.find(
        (property) =>
            (property.primitiveType === 'bool' || property.primitiveType === 'string') &&
            normalized(property.name).endsWith('isinterpreted')
    );
    return primaryPosted && secondaryPosted && interpreted
        ? { primaryPosted, secondaryPosted, interpreted }
        : undefined;
}

function draftGroup(entity: SchemaEntity): DraftGroup | undefined {
    const properties = propertyMap(entity);
    const hasDraft = properties.get('hasdraftentity');
    const hasActive = properties.get('hasactiveentity');
    const isActive = properties.get('isactiveentity');
    const activeUuid = properties.get('activeuuid');
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
    return protectedProperties.has(property.name);
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
    parsed.setUTCDate(parsed.getUTCDate() + 30 + (rowIndex % 60));
    const replacement = end.primitiveType === 'date' ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
    setIfValid(row, end, replacement);
}

function displayText(code: string, prefix: string): string {
    const parts = tokens(code);
    if (parts.length > 0 && parts.some((part) => /[a-z]/iu.test(part))) {
        return parts.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join(' ');
    }
    return `${prefix} ${code}`;
}

function statusText(code: string, property: SchemaProperty): string | undefined {
    const known = STATUS_VALUES.find((value) => value.code === code)?.text;
    const candidates = [known, displayText(code, 'Status'), code].filter(
        (candidate): candidate is string => candidate !== undefined
    );
    return candidates.find((candidate) => propertyValueIsValid(property, candidate));
}

function statusDomain(code: SchemaProperty, text: SchemaProperty): ReadonlyArray<readonly [string, string]> {
    const declared = code.enumValues?.filter((value): value is string => typeof value === 'string');
    const codes = declared && declared.length > 0 ? declared : STATUS_VALUES.map((value) => value.code);
    return [...new Set(codes)].flatMap((candidate) => {
        const label = statusText(candidate, text);
        return propertyValueIsValid(code, candidate) && label ? [[candidate, label] as const] : [];
    });
}

function reconcileStatus(
    rows: ReadonlyArray<MutableRow>,
    code: SchemaProperty,
    text: SchemaProperty,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    const values = statusDomain(code, text);
    if (values.length === 0) {
        return;
    }
    const preserveCodes = propertyIsProtected(code, protectedProperties) || (code.isKey && rows.length > values.length);
    rows.forEach((row, rowIndex) => {
        if (preserveCodes) {
            const currentCode = row[code.name];
            const label = typeof currentCode === 'string' ? statusText(currentCode, text) : undefined;
            if (label && propertyValueIsValid(code, currentCode)) {
                row[text.name] = label;
            }
            return;
        }
        const [candidateCode, label] = values[(Math.abs(seed) + rowIndex) % values.length];
        row[code.name] = candidateCode;
        row[text.name] = label;
    });
}

function unitValue(code: string, group: UnitGroup): Readonly<{ code: string; iso: string; text: string }> | undefined {
    const known = UNIT_VALUES.find((value) => value.code === code);
    const textCandidates = [known?.text, displayText(code, 'Unit'), code].filter(
        (candidate): candidate is string => candidate !== undefined
    );
    const isoCandidates = [known?.iso, code].filter((candidate): candidate is string => candidate !== undefined);
    const text = textCandidates.find((candidate) => propertyValueIsValid(group.text, candidate));
    const iso = isoCandidates.find((candidate) => propertyValueIsValid(group.iso, candidate));
    return propertyValueIsValid(group.code, code) && text && iso ? { code, text, iso } : undefined;
}

function unitDomain(group: UnitGroup): ReadonlyArray<Readonly<{ code: string; iso: string; text: string }>> {
    const declared = group.code.enumValues?.filter((value): value is string => typeof value === 'string');
    const codes = declared && declared.length > 0 ? declared : UNIT_VALUES.map((value) => value.code);
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
    if (values.length === 0) {
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
    if (balanceTupleIsValid(group, preferred)) {
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
 * Complete non-two-digit exceptions from the active ISO 4217 List One published by SIX on 2026-01-01.
 * Codes not listed here use two minor-unit digits. Precious-metal and testing codes have no minor unit.
 *
 * @see https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml
 */
const ISO_4217_MINOR_UNIT_EXCEPTIONS = new Map<string, number>([
    ...[
        'BIF',
        'CLP',
        'DJF',
        'GNF',
        'ISK',
        'JPY',
        'KMF',
        'KRW',
        'PYG',
        'RWF',
        'UGX',
        'UYI',
        'VND',
        'VUV',
        'XAF',
        'XOF',
        'XPF'
    ].map((currency) => [currency, 0] as const),
    ...['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'].map((currency) => [currency, 3] as const),
    ...['CLF', 'UYW'].map((currency) => [currency, 4] as const)
]);
const ISO_4217_WITHOUT_MINOR_UNIT = new Set([
    'XAG',
    'XAU',
    'XBA',
    'XBB',
    'XBC',
    'XBD',
    'XDR',
    'XPD',
    'XPT',
    'XSU',
    'XTS',
    'XUA',
    'XXX'
]);

function currencyFractionDigits(currency: string): number | undefined {
    return ISO_4217_WITHOUT_MINOR_UNIT.has(currency) ? undefined : (ISO_4217_MINOR_UNIT_EXCEPTIONS.get(currency) ?? 2);
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
        const factors: Readonly<Record<string, Readonly<{ numerator: number; denominator: number }>>> = {
            H: { numerator: 3_600, denominator: 1 },
            MIN: { numerator: 60, denominator: 1 },
            L: { numerator: 1, denominator: 1_000 }
        };
        const unit = group.unit ? row[group.unit.name] : undefined;
        const factor = typeof unit === 'string' ? factors[unit] : undefined;
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

const LIFECYCLE_STATES: ReadonlyArray<Readonly<Record<LifecycleRole, boolean>>> = [
    { available: true, deleted: false, inactive: false, installed: false, warehouse: true, customer: false },
    { available: false, deleted: false, inactive: false, installed: true, warehouse: false, customer: false },
    { available: false, deleted: false, inactive: true, installed: false, warehouse: false, customer: false },
    { available: false, deleted: true, inactive: false, installed: false, warehouse: false, customer: false }
];

function reconcileLifecycle(
    rows: ReadonlyArray<MutableRow>,
    group: Readonly<Partial<Record<LifecycleRole, SchemaProperty>>>,
    seed: number,
    protectedProperties: ReadonlySet<string>
): void {
    if (groupIsProtected(Object.values(group), protectedProperties)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        const state = LIFECYCLE_STATES[(Math.abs(seed) + rowIndex) % LIFECYCLE_STATES.length];
        for (const [role, property] of Object.entries(group) as Array<[LifecycleRole, SchemaProperty]>) {
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

/** Return fields governed as one cross-field coherence group. */
export function coherencePropertyNames(entity: SchemaEntity): ReadonlySet<string> {
    const names = new Set<string>();
    datePairs(entity)
        .flat()
        .forEach((property) => names.add(property.name));
    statusPairs(entity).forEach(([code, text]) => {
        if (statusDomain(code, text).length > 0) {
            [code, text].forEach((property) => names.add(property.name));
        }
    });
    const units = unitGroup(entity);
    if (units && unitDomain(units).length > 0) {
        Object.values(units).forEach((property) => property && names.add(property.name));
    }
    const balance = balanceGroup(entity);
    if (balance) {
        Object.values(balance).forEach((property) => names.add(property.name));
    }
    monetaryGroups(entity).forEach(({ amounts }) => amounts.forEach((property) => names.add(property.name)));
    const conversion = conversionGroup(entity);
    if (conversion) {
        Object.values(conversion).forEach((property) => property && names.add(property.name));
    }
    lifecycleGroups(entity).forEach((group) => Object.values(group).forEach((property) => names.add(property.name)));
    const draft = draftGroup(entity);
    if (draft) {
        Object.values(draft).forEach((property) => names.add(property.name));
    }
    const processingStatus = processingStatusGroup(entity);
    if (processingStatus) {
        Object.values(processingStatus).forEach((property) => names.add(property.name));
    }
    countryPhonePairs(entity).forEach(({ phone }) => names.add(phone.name));
    return names;
}

/** Reconcile conservative, metadata-derived cross-field groups before relationship planning and learned completion. */
export function applySemanticCoherence(
    entity: SchemaEntity,
    inputRows: ReadonlyArray<MockDataRow>,
    seed: number,
    protectedProperties: ReadonlySet<string> = new Set()
): ReadonlyArray<MockDataRow> {
    const rows = inputRows.map((row) => ({ ...row }));
    for (const [start, end] of datePairs(entity)) {
        rows.forEach((row, rowIndex) => reconcileDates(row, start, end, rowIndex, protectedProperties));
    }
    for (const [code, text] of statusPairs(entity)) {
        reconcileStatus(rows, code, text, seed, protectedProperties);
    }
    const units = unitGroup(entity);
    if (units) {
        reconcileUnits(rows, units, seed, protectedProperties);
    }
    for (const monetaryGroup of monetaryGroups(entity)) {
        reconcileMonetaryGroup(rows, monetaryGroup, protectedProperties);
    }
    const balance = balanceGroup(entity);
    if (balance) {
        rows.forEach((row) => reconcileBalance(row, balance, protectedProperties));
    }
    const conversion = conversionGroup(entity);
    if (conversion) {
        reconcileConversion(rows, conversion, protectedProperties);
    }
    for (const group of lifecycleGroups(entity)) {
        reconcileLifecycle(rows, group, seed, protectedProperties);
    }
    const draft = draftGroup(entity);
    if (draft) {
        reconcileDraft(rows, draft, seed, protectedProperties);
    }
    const processingStatus = processingStatusGroup(entity);
    if (processingStatus) {
        reconcileProcessingStatus(rows, processingStatus, seed, protectedProperties);
    }
    const countryPhones = countryPhonePairs(entity);
    if (countryPhones.length > 0) {
        reconcileCountryPhones(rows, countryPhones, seed, protectedProperties);
    }
    return rows;
}
