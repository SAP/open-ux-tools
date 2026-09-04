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
    { code: 'KG', iso: 'KG', text: 'Kilogram' },
    { code: 'L', iso: 'L', text: 'Litre' },
    { code: 'H', iso: 'H', text: 'Hour' },
    { code: 'PC', iso: 'PC', text: 'Piece' },
    { code: 'M', iso: 'M', text: 'Metre' },
    { code: 'S', iso: 'S', text: 'Second' },
    { code: 'MIN', iso: 'MIN', text: 'Minute' },
    { code: 'D', iso: 'D', text: 'Day' },
    { code: 'WK', iso: 'WK', text: 'Week' }
] as const;

const START_MARKERS = new Set(['start', 'begin', 'from']);
const END_MARKERS = new Set(['end', 'until', 'to']);
const TEMPORAL_TYPES = new Set<SchemaProperty['primitiveType']>(['date', 'datetime', 'datetimeoffset']);

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
}

function unitGroup(entity: SchemaEntity): UnitGroup | undefined {
    const properties = propertyMap(entity);
    const code = properties.get('unitofmeasure');
    const text = properties.get('unitofmeasuretext');
    const iso = properties.get('unitofmeasureisocode');
    return code?.primitiveType === 'string' && text?.primitiveType === 'string' && iso?.primitiveType === 'string'
        ? { code, text, iso }
        : undefined;
}

interface BalanceGroup {
    opening: SchemaProperty;
    debit: SchemaProperty;
    credit: SchemaProperty;
    closing: SchemaProperty;
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

function reconcileDates(row: MutableRow, start: SchemaProperty, end: SchemaProperty, rowIndex: number): void {
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

function reconcileStatus(
    rows: ReadonlyArray<MutableRow>,
    code: SchemaProperty,
    text: SchemaProperty,
    seed: number
): void {
    const values = STATUS_VALUES.filter(
        (value) => propertyValueIsValid(code, value.code) && propertyValueIsValid(text, value.text)
    );
    if (values.length === 0 || (code.isKey && rows.length > values.length)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        const value = values[(Math.abs(seed) + rowIndex) % values.length];
        row[code.name] = value.code;
        row[text.name] = value.text;
    });
}

function reconcileUnits(rows: ReadonlyArray<MutableRow>, group: UnitGroup, seed: number): void {
    const values = UNIT_VALUES.filter(
        (value) =>
            propertyValueIsValid(group.code, value.code) &&
            propertyValueIsValid(group.text, value.text) &&
            propertyValueIsValid(group.iso, value.iso)
    );
    if (values.length === 0 || (group.code.isKey && rows.length > values.length)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        const value = values[(Math.abs(seed) + rowIndex) % values.length];
        row[group.code.name] = value.code;
        row[group.text.name] = value.text;
        row[group.iso.name] = value.iso;
    });
}

function rounded(value: number, property: SchemaProperty): number {
    return Number(value.toFixed(property.primitiveType === 'int' ? 0 : (property.scale ?? 2)));
}

function reconcileBalance(row: MutableRow, group: BalanceGroup): void {
    const opening = row[group.opening.name];
    const debit = row[group.debit.name];
    const credit = row[group.credit.name];
    if (typeof opening !== 'number' || typeof debit !== 'number' || typeof credit !== 'number') {
        return;
    }
    const safeOpening = Math.abs(opening);
    const safeCredit = Math.abs(credit);
    const safeDebit = Math.min(Math.abs(debit), safeOpening + safeCredit);
    const closing = rounded(safeOpening + safeCredit - safeDebit, group.closing);
    setIfValid(row, group.opening, rounded(safeOpening, group.opening));
    setIfValid(row, group.credit, rounded(safeCredit, group.credit));
    setIfValid(row, group.debit, rounded(safeDebit, group.debit));
    setIfValid(row, group.closing, closing);
}

const LIFECYCLE_STATES: ReadonlyArray<Readonly<Record<LifecycleRole, boolean>>> = [
    { available: true, deleted: false, inactive: false, installed: false, warehouse: true, customer: false },
    { available: true, deleted: false, inactive: false, installed: true, warehouse: false, customer: false },
    { available: false, deleted: false, inactive: true, installed: false, warehouse: false, customer: false },
    { available: false, deleted: true, inactive: false, installed: false, warehouse: false, customer: false }
];

function reconcileLifecycle(
    rows: ReadonlyArray<MutableRow>,
    group: Readonly<Partial<Record<LifecycleRole, SchemaProperty>>>,
    seed: number
): void {
    rows.forEach((row, rowIndex) => {
        const state = LIFECYCLE_STATES[(Math.abs(seed) + rowIndex) % LIFECYCLE_STATES.length];
        for (const [role, property] of Object.entries(group) as Array<[LifecycleRole, SchemaProperty]>) {
            setIfValid(row, property, state[role]);
        }
    });
}

function reconcileDraft(rows: ReadonlyArray<MutableRow>, group: DraftGroup, seed: number): void {
    rows.forEach((row, rowIndex) => {
        const active = (Math.abs(seed) + rowIndex) % 2 === 0;
        setIfValid(row, group.isActive, active);
        setIfValid(row, group.hasActive, !active);
        setIfValid(row, group.hasDraft, active);
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

function reconcileProcessingStatus(rows: ReadonlyArray<MutableRow>, group: ProcessingStatusGroup, seed: number): void {
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
    statusPairs(entity)
        .flat()
        .forEach((property) => names.add(property.name));
    const units = unitGroup(entity);
    if (units) {
        Object.values(units).forEach((property) => names.add(property.name));
    }
    const balance = balanceGroup(entity);
    if (balance) {
        Object.values(balance).forEach((property) => names.add(property.name));
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
    return names;
}

/** Reconcile conservative, metadata-derived cross-field groups before relationship planning and learned completion. */
export function applySemanticCoherence(
    entity: SchemaEntity,
    inputRows: ReadonlyArray<MockDataRow>,
    seed: number
): ReadonlyArray<MockDataRow> {
    const rows = inputRows.map((row) => ({ ...row }));
    for (const [start, end] of datePairs(entity)) {
        rows.forEach((row, rowIndex) => reconcileDates(row, start, end, rowIndex));
    }
    for (const [code, text] of statusPairs(entity)) {
        reconcileStatus(rows, code, text, seed);
    }
    const units = unitGroup(entity);
    if (units) {
        reconcileUnits(rows, units, seed);
    }
    const balance = balanceGroup(entity);
    if (balance) {
        rows.forEach((row) => reconcileBalance(row, balance));
    }
    for (const group of lifecycleGroups(entity)) {
        reconcileLifecycle(rows, group, seed);
    }
    const draft = draftGroup(entity);
    if (draft) {
        reconcileDraft(rows, draft, seed);
    }
    const processingStatus = processingStatusGroup(entity);
    if (processingStatus) {
        reconcileProcessingStatus(rows, processingStatus, seed);
    }
    return rows;
}
