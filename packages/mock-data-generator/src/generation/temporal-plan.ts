import type { SchemaEntity, SchemaGraph, SchemaProperty, SchemaRelationship } from '../schema/graph.js';
import type {
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorDiagnosticCode,
    MockDataRow,
    SyntheticCoherenceRule
} from '../types.js';
import { semanticRules } from '../semantics/rule-store.js';
import { propertyValueIsValid } from './constraints.js';
import { identifierTokens } from '../naming.js';
import { freezeRows, isKeyOrEnumerated } from './rows.js';
import { sha256Uint32 } from '../hash.js';
import { lazy } from '../lazy.js';

export interface TemporalConstraint {
    resource: string;
    before: string;
    after: string;
}

interface PlannedConstraint extends TemporalConstraint {
    synthetic: boolean;
}

/**
 * Disable competing inferred temporal rules when a resource has an explicit temporal plan.
 *
 * @param resource Resource whose coherence is being resolved.
 * @param rules Optional selected coherence rules; temporal is the existing default.
 * @param explicit Configured temporal ordering.
 * @returns Remaining inference rules, preserving all non-temporal selections.
 */
export function inferredCoherenceRules(
    resource: string,
    rules: readonly SyntheticCoherenceRule[] | undefined,
    explicit: readonly TemporalConstraint[] = []
): readonly SyntheticCoherenceRule[] | undefined {
    return explicit.some((constraint) => constraint.resource === resource)
        ? (rules ?? ['temporal']).filter((rule) => rule !== 'temporal')
        : rules;
}

const TEMPORAL_TYPES = new Set(['date', 'datetime', 'datetimeoffset', 'time']);

/** Every word of the temporal vocabulary that names an event or a bound of a period. */
const lifecycleWords = lazy(() => {
    const { created, changed, start, end } = semanticRules().temporalVocabulary;
    return new Set([created, changed, start, end].flatMap((markers) => [...markers]));
});

/**
 * The words of a field for the temporal vocabulary: its label's, or its name's when the label names no
 * event (a generic `Time Stamp` label on both `CreatedStamp` and `ChangedStamp`).
 *
 * @param property the field
 * @returns the words
 */
function words(property: SchemaProperty): string[] {
    const tokens = (text: string): string[] => identifierTokens(text, { splitAcronyms: false, lettersOnly: true });
    const label = property.label === undefined ? [] : tokens(property.label);
    return label.some((word) => lifecycleWords().has(word)) ? label : tokens(property.name);
}

function has(property: SchemaProperty, markers: ReadonlySet<string>): boolean {
    return words(property).some((word) => markers.has(word));
}

function diagnostic(
    code: Extract<MockDataGeneratorDiagnosticCode, `${string}TEMPORAL_${string}`>,
    constraint: TemporalConstraint,
    message: string
): MockDataGeneratorDiagnostic {
    return {
        code,
        severity: code === 'SYNTHETIC_TEMPORAL_ASSUMPTION' ? 'info' : 'warning',
        target: constraint.resource,
        message: `${constraint.before} <= ${constraint.after}: ${message}`
    };
}

/**
 * The one field that ends the pair a field starts: a field with a later word whose other words are the
 * same, or, when there is none, of the same type and the same once the words of the clock are set aside
 * (`creationTime` and `modifiedAt`).
 *
 * @param properties the entity's temporal fields
 * @param before the field with an earlier word
 * @param markers the earlier, the later and the clock words
 * @returns the later field, or undefined when none or several match
 */
function laterOfPair(
    properties: ReadonlyArray<SchemaProperty>,
    before: SchemaProperty,
    markers: Readonly<{ early: ReadonlySet<string>; late: ReadonlySet<string>; clock: ReadonlySet<string> }>
): SchemaProperty | undefined {
    const { early, late, clock } = markers;
    const signature = (property: SchemaProperty, ignored: ReadonlySet<string> = new Set()): string =>
        words(property)
            .filter((word) => !early.has(word) && !late.has(word) && word !== 'last' && !ignored.has(word))
            .join(':');
    const exact = properties.filter((property) => has(property, late) && signature(property) === signature(before));
    const matches =
        exact.length > 0
            ? exact
            : properties.filter(
                  (property) =>
                      has(property, late) &&
                      property.primitiveType === before.primitiveType &&
                      signature(property, clock) === signature(before, clock)
              );
    return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Compile explicit constraints or conservative, reported synthetic lifecycle assumptions.
 *
 * @param graph Service schema.
 * @param explicit Configured field ordering, overriding inference for the named resource.
 * @param coherence Per-resource inference controls.
 * @returns Executable constraints and invalid-configuration diagnostics.
 */
export function compileTemporalPlan(
    graph: SchemaGraph,
    explicit: readonly TemporalConstraint[] = [],
    coherence: Readonly<Record<string, readonly SyntheticCoherenceRule[]>> = {}
): {
    constraints: readonly PlannedConstraint[];
    diagnostics: MockDataGeneratorDiagnostic[];
} {
    const constraints: PlannedConstraint[] = [];
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    for (const constraint of explicit) {
        const entity = graph.entities.find(({ entitySetName }) => entitySetName === constraint.resource);
        const before = entity?.properties.find(({ name }) => name === constraint.before);
        const after = entity?.properties.find(({ name }) => name === constraint.after);
        if (
            !before ||
            !after ||
            before === after ||
            !TEMPORAL_TYPES.has(before.primitiveType) ||
            before.primitiveType !== after.primitiveType
        ) {
            diagnostics.push(
                diagnostic('TEMPORAL_CONSTRAINT_INVALID', constraint, 'Unknown or incompatible temporal fields.')
            );
        } else {
            constraints.push({ ...constraint, synthetic: false });
        }
    }
    // Lifecycle words of the semantic rule store: administrative created/changed timestamps and interval
    // start/end bounds. Which business event comes before another is not known from words, so none is ordered.
    const { created, changed, start, end, clock } = semanticRules().temporalVocabulary;
    for (const entity of graph.entities) {
        if (
            explicit.some(({ resource }) => resource === entity.entitySetName) ||
            !(coherence[entity.entitySetName] ?? ['temporal']).includes('temporal')
        ) {
            continue;
        }
        const properties = entity.properties.filter(({ primitiveType }) => TEMPORAL_TYPES.has(primitiveType));
        const add = (before: SchemaProperty, after: SchemaProperty): void => {
            if (before.primitiveType === after.primitiveType) {
                constraints.push({
                    resource: entity.entitySetName,
                    before: before.name,
                    after: after.name,
                    synthetic: true
                });
            }
        };
        for (const [early, late] of [
            [created, changed],
            [start, end]
        ]) {
            for (const before of properties.filter((property) => has(property, early))) {
                const after = laterOfPair(properties, before, { early, late, clock });
                if (after) {
                    add(before, after);
                }
            }
        }
    }
    const cyclic = constraints.filter((constraint) => {
        const seen = new Set<string>();
        const reaches = (field: string): boolean => {
            if (field === constraint.before) {
                return true;
            }
            if (seen.has(field)) {
                return false;
            }
            seen.add(field);
            return constraints.some(
                (edge) => edge.resource === constraint.resource && edge.before === field && reaches(edge.after)
            );
        };
        return reaches(constraint.after);
    });
    cyclic.forEach((constraint) =>
        diagnostics.push(
            diagnostic(
                'TEMPORAL_CONSTRAINT_INVALID',
                constraint,
                'Cyclic ordering is ambiguous; no automatic repair is permitted.'
            )
        )
    );
    return { constraints: constraints.filter((constraint) => !cyclic.includes(constraint)), diagnostics };
}

function comparable(value: JsonValue | undefined, property: SchemaProperty): number {
    if (typeof value !== 'string') {
        return Number.NaN;
    }
    return property.primitiveType === 'time' ? Number(value.replaceAll(':', '')) : Date.parse(value);
}

/**
 * Independently check final rows, including cache-loaded rows, against the temporal plan.
 *
 * @param graph Service schema.
 * @param resources Final row values.
 * @param explicit Configured field ordering.
 * @param coherence Per-resource inference controls.
 * @returns Constraint violations without generated values in diagnostic messages.
 */
export function validateTemporalPlan(
    graph: SchemaGraph,
    resources: Readonly<Record<string, readonly MockDataRow[]>>,
    explicit: readonly TemporalConstraint[] = [],
    coherence: Readonly<Record<string, readonly SyntheticCoherenceRule[]>> = {}
): MockDataGeneratorDiagnostic[] {
    const plan = compileTemporalPlan(graph, explicit, coherence);
    for (const constraint of plan.constraints) {
        const property = graph.entities
            .find(({ entitySetName }) => entitySetName === constraint.resource)
            ?.properties.find(({ name }) => name === constraint.before);
        if (!property) {
            continue;
        }
        const violations = (resources[constraint.resource] ?? []).filter(
            (row) =>
                row[constraint.before] != null &&
                row[constraint.after] != null &&
                !(comparable(row[constraint.before], property) <= comparable(row[constraint.after], property))
        ).length;
        if (violations > 0) {
            plan.diagnostics.push(
                diagnostic(
                    'TEMPORAL_CONSTRAINT_VIOLATION',
                    constraint,
                    `${violations} row(s) violate ordering; protected values are not overwritten.`
                )
            );
        }
    }
    return plan.diagnostics;
}

const MILLISECONDS_PER_DAY = 86_400_000;
const SECONDS_PER_DAY = 86_400;
const EVENT_PART_TYPES = new Set(['date', 'time']);
const TIMESTAMP_TYPES = new Set(['datetime', 'datetimeoffset']);

/**
 * A later instant for the second event of a row, from the first, by the rule store's temporal spread: in
 * most rows an exponentially distributed number of days and a number of minutes later, in the others at
 * the same instant.
 *
 * @param value the earlier event's value
 * @param property the later event's field
 * @param hash stable hash of the cell
 * @returns the later value, or undefined to keep the instant
 */
function laterEvent(value: JsonValue | undefined, property: SchemaProperty, hash: number): string | undefined {
    const { unchangedOneIn, meanGapDays, maximumGapDays } = semanticRules().temporalSpread;
    if (hash % unchangedOneIn === 0) {
        return undefined;
    }
    const minutes = gapMinutes(hash);
    if (property.primitiveType === 'time') {
        return laterTime(value, minutes);
    }
    const time = instantOf(value);
    if (time === undefined || !(property.primitiveType === 'date' || TIMESTAMP_TYPES.has(property.primitiveType))) {
        return undefined;
    }
    const uniform = (Math.floor(hash / unchangedOneIn) % 1_000_000) / 1_000_000;
    const days = Math.min(maximumGapDays, 1 + Math.floor(-Math.log(1 - uniform) * meanGapDays));
    const later = new Date(time + days * MILLISECONDS_PER_DAY + minutes * 60_000).toISOString();
    return property.primitiveType === 'date' ? later.slice(0, 10) : later;
}

/**
 * The minutes a time of day moves by, uniform in the rule store's range and independent of the days the
 * cell's hash gives.
 *
 * @param hash stable hash of the cell
 * @returns the minutes
 */
function gapMinutes(hash: number): number {
    const { minimum, maximum } = semanticRules().temporalSpread.gapMinutes;
    return minimum + (sha256Uint32(`${hash}:minutes`) % (maximum - minimum));
}

/**
 * A later time of the same day, in the format of the earlier one.
 *
 * @param value the earlier time, `14:05:09` or `PT14H05M09S`
 * @param minutes how many minutes later
 * @returns the later time, or undefined when the earlier time is not a time or the day has no room left
 */
function laterTime(value: JsonValue | undefined, minutes: number): string | undefined {
    const parts = typeof value === 'string' ? /^(?:PT)?(\d{2})[H:](\d{2})[M:](\d{2})/u.exec(value) : null;
    if (!parts) {
        return undefined;
    }
    const later = (Number(parts[1]) * 60 + Number(parts[2])) * 60 + Number(parts[3]) + minutes * 60;
    return later < SECONDS_PER_DAY ? timeLike(value, new Date(later * 1_000)) : undefined;
}

/**
 * Spread the later event of each ordered pair from the earlier one where generation wrote both at the same
 * instant, so a change or an end follows its creation or start.
 *
 * @param graph the service schema
 * @param rows the entity's rows; written in place
 * @param constraint the ordered pair
 * @param fixed whether a field may not be written
 */
function spreadLaterEvents(
    graph: SchemaGraph,
    rows: ReadonlyArray<Record<string, JsonValue>>,
    constraint: PlannedConstraint,
    fixed: (property: SchemaProperty) => boolean
): void {
    const entity = graph.entities.find(({ entitySetName }) => entitySetName === constraint.resource);
    const before = entity?.properties.find(({ name }) => name === constraint.before);
    const after = entity?.properties.find(({ name }) => name === constraint.after);
    if (!before || !after || fixed(after)) {
        return;
    }
    rows.forEach((row, rowIndex) => {
        if (
            row[before.name] !== row[after.name] &&
            comparable(row[before.name], before) !== comparable(row[after.name], after)
        ) {
            return;
        }
        const later = laterEvent(
            row[before.name],
            after,
            sha256Uint32(`${constraint.resource}:${after.name}:${rowIndex}:${String(row[before.name])}`)
        );
        if (later !== undefined && propertyValueIsValid(after, later)) {
            row[after.name] = later;
        }
    });
}

/**
 * The event a temporal field names: its name words without clock words (`ReceiptDateTime`, `ReceiptDate`
 * and `ReceiptTime` all name the receipt).
 *
 * @param property the field
 * @returns the event's words
 */
function eventOf(property: SchemaProperty): string {
    const clock = semanticRules().temporalVocabulary.clock;
    return identifierTokens(property.name, { lettersOnly: true })
        .filter((token) => !clock.has(token))
        .join(' ');
}

/**
 * Keep the separate date and time of an event equal to its timestamp: where an entity has exactly one
 * timestamp, one date and one time naming the same event, the free date and time take the timestamp's.
 *
 * @param properties the entity's properties
 * @param rows the entity's rows; written in place
 * @param fixed whether a field may not be written
 */
function alignEventParts(
    properties: ReadonlyArray<SchemaProperty>,
    rows: ReadonlyArray<Record<string, JsonValue>>,
    fixed: (property: SchemaProperty) => boolean
): void {
    const temporal = properties.filter(({ primitiveType }) => TEMPORAL_TYPES.has(primitiveType));
    for (const timestamp of temporal.filter(({ primitiveType }) => TIMESTAMP_TYPES.has(primitiveType))) {
        const event = eventOf(timestamp);
        const sameEvent = temporal.filter((property) => property !== timestamp && eventOf(property) === event);
        if (event === '' || sameEvent.some(({ primitiveType }) => TIMESTAMP_TYPES.has(primitiveType))) {
            continue;
        }
        const parts = sameEvent.filter(
            (part) =>
                EVENT_PART_TYPES.has(part.primitiveType) &&
                !fixed(part) &&
                sameEvent.filter((other) => other.primitiveType === part.primitiveType).length === 1
        );
        parts.forEach((part) => rows.forEach((row) => writeEventPart(row, timestamp, part)));
    }
}

/**
 * Write the date or the time of a row's timestamp into the field that holds that part of the event.
 *
 * @param row the row; written in place
 * @param timestamp the timestamp field
 * @param part the date or time field
 */
function writeEventPart(row: Record<string, JsonValue>, timestamp: SchemaProperty, part: SchemaProperty): void {
    const time = instantOf(row[timestamp.name]);
    if (time === undefined) {
        return;
    }
    const instant = new Date(time);
    const value =
        part.primitiveType === 'date' ? instant.toISOString().slice(0, 10) : timeLike(row[part.name], instant);
    if (propertyValueIsValid(part, value)) {
        row[part.name] = value;
    }
}

/**
 * The time of an instant in the format a time value already has: an ISO 8601 duration (`PT14H05M09S`, the
 * OData V2 `Edm.Time` form) or a time of day (`14:05:09`).
 *
 * @param current the time field's current value
 * @param instant the instant
 * @returns the time
 */
function timeLike(current: JsonValue | undefined, instant: Date): string {
    const [hours, minutes, seconds] = instant.toISOString().slice(11, 19).split(':');
    return typeof current === 'string' && current.startsWith('PT')
        ? `PT${hours}H${minutes}M${seconds}S`
        : `${hours}:${minutes}:${seconds}`;
}

/**
 * The instant of a date or timestamp value.
 *
 * @param value the value
 * @returns milliseconds since the epoch, or undefined when the value is not a date
 */
function instantOf(value: JsonValue | undefined): number | undefined {
    const time = typeof value === 'string' ? Date.parse(value) : Number.NaN;
    return Number.isNaN(time) ? undefined : time;
}

/**
 * The one field of a list, or undefined when there is none or several.
 *
 * @param fields the fields
 * @returns the field
 */
function onlyOne(fields: ReadonlyArray<SchemaProperty>): SchemaProperty | undefined {
    return fields.length === 1 ? fields[0] : undefined;
}

/**
 * The one creation date or timestamp of an entity.
 *
 * @param properties the entity's properties
 * @returns the field, or undefined when the entity has none or several
 */
function creationField(properties: ReadonlyArray<SchemaProperty>): SchemaProperty | undefined {
    const { created } = semanticRules().temporalVocabulary;
    return onlyOne(
        properties.filter(
            (property) =>
                TEMPORAL_TYPES.has(property.primitiveType) &&
                property.primitiveType !== 'time' &&
                has(property, created)
        )
    );
}

/**
 * The relationships from a record to the record it belongs to, by metadata alone: a single-valued reference
 * whose mapped fields are part of the record's key next to a key of its own (an item keyed by its order and
 * an item number), or the reference back from a record its parent contains (OData `ContainsTarget`). A
 * plain reference says nothing about which record came first.
 *
 * @param graph the service schema
 * @returns the relationships, from the dependent record to its parent
 */
function dependenceRelationships(graph: SchemaGraph): ReadonlyArray<SchemaRelationship> {
    const keysOf = new Map(
        graph.entities.map((entity) => [
            entity.entitySetName,
            new Set(entity.properties.filter(({ isKey }) => isKey).map(({ name }) => name))
        ])
    );
    const contains = (parent: string, child: string): boolean =>
        graph.relationships.some(
            ({ fromEntitySet, toEntitySet, containsTarget }) =>
                containsTarget === true && fromEntitySet === parent && toEntitySet === child
        );
    return graph.relationships.filter(({ mappings, targetCardinality, fromEntitySet, toEntitySet }) => {
        if (mappings.length === 0 || targetCardinality === 'many' || fromEntitySet === toEntitySet) {
            return false;
        }
        const keys = keysOf.get(fromEntitySet) ?? new Set<string>();
        const keyedByParent =
            mappings.every(({ sourceProperty }) => keys.has(sourceProperty)) && keys.size > mappings.length;
        return keyedByParent || contains(toEntitySet, fromEntitySet);
    });
}

/**
 * A field and the fields the plan orders after it in its entity, directly or through other fields.
 *
 * @param entity the entity
 * @param first the first field
 * @param constraints the ordered pairs
 * @returns the fields, the first one included
 */
function eventsFrom(
    entity: SchemaEntity,
    first: SchemaProperty,
    constraints: readonly PlannedConstraint[]
): SchemaProperty[] {
    const names = new Set([first.name]);
    for (let added = true; added;) {
        added = false;
        for (const { resource, before, after } of constraints) {
            if (resource === entity.entitySetName && names.has(before) && !names.has(after)) {
                names.add(after);
                added = true;
            }
        }
    }
    return entity.properties.filter(({ name }) => names.has(name));
}

/** One dependent entity set, its parent and their creation fields. */
interface Dependence {
    relationship: SchemaRelationship;
    child: SchemaEntity;
    childCreated: SchemaProperty;
    parentCreated: SchemaProperty;
    /** The child's creation and the free events the plan orders after it. */
    events: ReadonlyArray<SchemaProperty>;
}

/**
 * Move every child row created before its parent to or after the parent's creation.
 *
 * @param dependence the child and its parent
 * @param rows the rows by entity set; written in place
 * @returns whether a row moved
 */
function followParent(
    dependence: Dependence,
    rows: Readonly<Record<string, ReadonlyArray<Record<string, JsonValue>>>>
): boolean {
    const { relationship, child, childCreated, parentCreated, events } = dependence;
    const keyOf = (row: Record<string, JsonValue>, side: 'sourceProperty' | 'targetProperty'): string =>
        JSON.stringify(relationship.mappings.map((mapping) => row[mapping[side]] ?? null));
    const parents = new Map((rows[relationship.toEntitySet] ?? []).map((row) => [keyOf(row, 'targetProperty'), row]));
    let moved = false;
    (rows[child.entitySetName] ?? []).forEach((row, rowIndex) => {
        const parentValue = parents.get(keyOf(row, 'sourceProperty'))?.[parentCreated.name];
        const parentAt = instantOf(parentValue);
        const childAt = instantOf(row[childCreated.name]);
        if (parentAt === undefined || childAt === undefined || childAt >= parentAt) {
            return;
        }
        const later =
            laterEvent(
                parentValue,
                childCreated,
                sha256Uint32(`${child.entitySetName}:${childCreated.name}:${rowIndex}:parent`)
            ) ?? sameInstant(parentAt, childCreated);
        const laterAt = instantOf(later);
        if (laterAt !== undefined && propertyValueIsValid(childCreated, later)) {
            shiftTimeline(row, events, laterAt - childAt);
            moved = true;
        }
    });
    return moved;
}

/**
 * Create a record no earlier than the record it belongs to (see `dependenceRelationships`): where both have
 * one creation field and the dependent record was created first, its creation, and the events the plan
 * orders after it, move to or after the parent's creation. Other dates of the record are left alone.
 *
 * @param graph the service schema
 * @param constraints the ordered pairs
 * @param rows the rows by entity set; written in place
 * @param fixedIn whether a field of an entity set may not be written
 * @param diagnostics receives one assumption per relationship applied
 */
function followParentCreation(
    graph: SchemaGraph,
    constraints: readonly PlannedConstraint[],
    rows: Readonly<Record<string, ReadonlyArray<Record<string, JsonValue>>>>,
    fixedIn: (entitySet: string, property: SchemaProperty) => boolean,
    diagnostics: MockDataGeneratorDiagnostic[]
): void {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const dependences = dependenceRelationships(graph).flatMap((relationship): Dependence[] => {
        const child = entities.get(relationship.fromEntitySet);
        const childCreated = creationField(child?.properties ?? []);
        const parentCreated = creationField(entities.get(relationship.toEntitySet)?.properties ?? []);
        if (!child || !childCreated || !parentCreated || fixedIn(child.entitySetName, childCreated)) {
            return [];
        }
        const events = eventsFrom(child, childCreated, constraints).filter(
            (property) => !fixedIn(child.entitySetName, property)
        );
        return [{ relationship, child, childCreated, parentCreated, events }];
    });
    const applied = new Set<Dependence>();
    // A grandchild may follow a child that has just followed its own parent: one pass per dependence settles
    // any chain.
    for (let pass = 0; pass < dependences.length; pass++) {
        const moved = dependences.filter((dependence) => followParent(dependence, rows));
        moved.forEach((dependence) => applied.add(dependence));
        if (moved.length === 0) {
            break;
        }
    }
    for (const { relationship, child, childCreated, parentCreated } of applied) {
        diagnostics.push(
            diagnostic(
                'SYNTHETIC_TEMPORAL_ASSUMPTION',
                {
                    resource: child.entitySetName,
                    before: `${relationship.toEntitySet}.${parentCreated.name}`,
                    after: childCreated.name
                },
                'A record keyed by or contained in its parent is created no earlier than the parent.'
            )
        );
    }
}

/**
 * Move the events of a row later by one offset, so they keep their order and gaps: dates by whole days,
 * at least the offset.
 *
 * @param row the row; written in place
 * @param fields the date and timestamp fields of its timeline
 * @param offset milliseconds
 */
function shiftTimeline(row: Record<string, JsonValue>, fields: ReadonlyArray<SchemaProperty>, offset: number): void {
    for (const field of fields) {
        const time = instantOf(row[field.name]);
        const shift =
            field.primitiveType === 'date' ? Math.ceil(offset / MILLISECONDS_PER_DAY) * MILLISECONDS_PER_DAY : offset;
        const value = time === undefined ? undefined : sameInstant(time + shift, field);
        if (value !== undefined && propertyValueIsValid(field, value)) {
            row[field.name] = value;
        }
    }
}

/**
 * An instant in the form of a date or timestamp field.
 *
 * @param time milliseconds since the epoch
 * @param property the field
 * @returns the value
 */
function sameInstant(time: number, property: SchemaProperty): string {
    const iso = new Date(time).toISOString();
    return property.primitiveType === 'date' ? iso.slice(0, 10) : iso;
}

/**
 * Swap the values of an ordered pair that generation wrote in the wrong order, or move the free one onto
 * the fixed one, repeated so that chained pairs settle.
 *
 * @param graph the service schema
 * @param constraints the ordered pairs
 * @param generated the rows by entity set; written in place
 * @param fixedIn whether a field of an entity set may not be written
 */
function repairOrder(
    graph: SchemaGraph,
    constraints: readonly PlannedConstraint[],
    generated: Readonly<Record<string, ReadonlyArray<Record<string, JsonValue>>>>,
    fixedIn: (entitySet: string, property: SchemaProperty) => boolean
): void {
    for (let pass = 0; pass < constraints.length; pass++) {
        for (const constraint of constraints) {
            const entity = graph.entities.find(({ entitySetName }) => entitySetName === constraint.resource);
            const before = entity?.properties.find(({ name }) => name === constraint.before);
            const after = entity?.properties.find(({ name }) => name === constraint.after);
            if (!before || !after) {
                continue;
            }
            const fixed = (property: SchemaProperty): boolean => fixedIn(constraint.resource, property);
            for (const row of generated[constraint.resource] ?? []) {
                const first = row[before.name];
                const last = row[after.name];
                if (!(comparable(first, before) > comparable(last, after))) {
                    continue;
                }
                if (!fixed(before) && propertyValueIsValid(before, last)) {
                    row[before.name] = last;
                    if (!fixed(after) && propertyValueIsValid(after, first)) {
                        row[after.name] = first;
                    }
                } else if (!fixed(after) && propertyValueIsValid(after, first)) {
                    row[after.name] = first;
                }
            }
        }
    }
}

/**
 * Repair only unconstrained generated fields; retain and report conflicting authoritative values.
 *
 * @param graph Service schema.
 * @param resources Rows to reconcile without mutation.
 * @param protectedProperties Authored, relationship and projected properties that cannot change.
 * @param diagnostics Receives synthetic assumptions and unresolved conflicts.
 * @param explicit Configured field ordering.
 * @param coherence Per-resource inference controls.
 * @returns Immutable reconciled rows, preserving key and enum values.
 */
export function reconcileTemporalPlan(
    graph: SchemaGraph,
    resources: Readonly<Record<string, readonly MockDataRow[]>>,
    protectedProperties: ReadonlyMap<string, ReadonlySet<string>>,
    diagnostics: MockDataGeneratorDiagnostic[],
    explicit: readonly TemporalConstraint[] = [],
    coherence: Readonly<Record<string, readonly SyntheticCoherenceRule[]>> = {}
): Readonly<Record<string, readonly MockDataRow[]>> {
    const plan = compileTemporalPlan(graph, explicit, coherence);
    const generated = Object.fromEntries(
        Object.entries(resources).map(([resource, rows]) => [resource, rows.map((row) => ({ ...row }))])
    );
    for (const constraint of plan.constraints.filter(({ synthetic }) => synthetic)) {
        diagnostics.push(
            diagnostic(
                'SYNTHETIC_TEMPORAL_ASSUMPTION',
                constraint,
                'Inferred lifecycle ordering from field metadata; configure explicit temporal constraints to override.'
            )
        );
    }
    const fixedIn = (entitySet: string, property: SchemaProperty): boolean =>
        isKeyOrEnumerated(property) || Boolean(protectedProperties.get(entitySet)?.has(property.name));
    followParentCreation(graph, plan.constraints, generated, fixedIn, diagnostics);
    for (const constraint of plan.constraints) {
        spreadLaterEvents(graph, generated[constraint.resource] ?? [], constraint, (property) =>
            fixedIn(constraint.resource, property)
        );
    }
    repairOrder(graph, plan.constraints, generated, fixedIn);
    for (const entity of graph.entities) {
        const fixed = (property: SchemaProperty): boolean => fixedIn(entity.entitySetName, property);
        alignEventParts(entity.properties, generated[entity.entitySetName] ?? [], fixed);
    }
    diagnostics.push(...validateTemporalPlan(graph, generated, explicit, coherence));
    return Object.freeze(
        Object.fromEntries(Object.entries(generated).map(([resource, rows]) => [resource, freezeRows(rows)]))
    );
}
