import { identifierTokens } from '../naming.js';
import { semanticRules } from '../semantics/rule-store.js';
import type { SchemaEntity, SchemaProperty } from '../schema/graph.js';
import type { JsonValue, MockDataRow } from '../types.js';
import { generatedRows, OutcomeCollector, REALISM_CHECK } from './realism-types.js';
import type { CheckOutcome, RealismInput } from './realism-types.js';

/**
 * The checks' vocabulary and thresholds.
 *
 * @returns the rule store's `realismChecks`
 */
const rules = (): ReturnType<typeof semanticRules>['realismChecks'] => semanticRules().realismChecks;
/** The events whose times are ordered. */
const EVENT_MARKERS = ['created', 'changed', 'from', 'to'] as const;
type EventMarker = (typeof EVENT_MARKERS)[number];
const ORDERED_EVENTS: ReadonlyArray<readonly [EventMarker, EventMarker]> = [
    ['created', 'changed'],
    ['from', 'to']
];
const TEMPORAL_TYPES = new Set(['date', 'datetime', 'datetimeoffset']);
const TIMESTAMP_TYPES = new Set(['datetime', 'datetimeoffset']);

interface TemporalField {
    property: SchemaProperty;
    marker?: EventMarker;
    /** Subject words without time and event words. */
    subject: string;
    /** Subject words with event words, without time words. */
    stem: string;
}

/**
 * The time a date or timestamp value denotes, in milliseconds, for ordering.
 *
 * @param value cell value
 * @returns milliseconds since the epoch, or undefined when the value is not a date or timestamp
 */
function instant(value: JsonValue | undefined): number | undefined {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/u.test(value)) {
        return undefined;
    }
    const time = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
    return Number.isNaN(time) ? undefined : time;
}

/**
 * The time of day a time or timestamp value is written with, as `HH:MM:SS`.
 *
 * @param value cell value (`12:49:00`, `PT12H49M00S` or an ISO timestamp)
 * @returns the time of day, or undefined
 */
function timeOfDay(value: JsonValue | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const duration = /^PT(\d{1,2})H(\d{1,2})M(\d{1,2})(?:\.\d+)?S$/u.exec(value);
    if (duration) {
        return duration
            .slice(1, 4)
            .map((part) => part.padStart(2, '0'))
            .join(':');
    }
    return /(?:^|T)(\d{2}:\d{2}:\d{2})/u.exec(value)?.[1];
}

/**
 * How a date, time or timestamp field is named: which event it marks and what it is about.
 *
 * @param property schema property
 * @returns the field's temporal naming
 */
function temporalField(property: SchemaProperty): TemporalField {
    const tokens = identifierTokens(property.name, { lettersOnly: true });
    const { eventWords, timeWords, qualifierWords } = rules();
    const marker = EVENT_MARKERS.find((name) => tokens.some((token) => eventWords[name].has(token)));
    const withoutTime = tokens.filter((token) => !timeWords.has(token));
    return {
        property,
        marker,
        stem: withoutTime.join(' '),
        subject: withoutTime
            .filter((token) => !qualifierWords.has(token) && !EVENT_MARKERS.some((name) => eventWords[name].has(token)))
            .join(' ')
    };
}

/**
 * The single field of an entity matching a predicate, or undefined when none or several match.
 *
 * @param fields candidate fields
 * @param matches predicate
 * @returns the unique match
 */
function unique<Field>(fields: ReadonlyArray<Field>, matches: (field: Field) => boolean): Field | undefined {
    const found = fields.filter(matches);
    return found.length === 1 ? found[0] : undefined;
}

/**
 * Ordered event pairs of an entity (creation before change, validity start before end) of the same type
 * and subject, each named by exactly one field.
 *
 * @param fields temporal fields of the entity
 * @returns the pairs as (earlier, later)
 */
function orderedPairs(fields: ReadonlyArray<TemporalField>): Array<readonly [TemporalField, TemporalField]> {
    const pairs: Array<readonly [TemporalField, TemporalField]> = [];
    for (const [earlierMarker, laterMarker] of ORDERED_EVENTS) {
        for (const earlier of fields.filter(({ marker }) => marker === earlierMarker)) {
            const sameKind = (field: TemporalField): boolean =>
                field.subject === earlier.subject && field.property.primitiveType === earlier.property.primitiveType;
            const later = unique(fields, (field) => field.marker === laterMarker && sameKind(field));
            if (later && unique(fields, (field) => field.marker === earlierMarker && sameKind(field)) === earlier) {
                pairs.push([earlier, later]);
            }
        }
    }
    return pairs;
}

/**
 * Ordering and identity of event pairs: the earlier event never lies after the later one, and a change is
 * not the creation in every row.
 *
 * @param entity schema entity
 * @param rows generated rows
 * @param fields temporal fields of the entity
 * @param order collector of ordering findings
 * @param identity collector of identity findings
 */
function checkPairs(
    entity: SchemaEntity,
    rows: ReadonlyArray<MockDataRow>,
    fields: ReadonlyArray<TemporalField>,
    order: OutcomeCollector,
    identity: OutcomeCollector
): void {
    for (const [earlier, later] of orderedPairs(fields)) {
        const both = rows
            .map((row) => [row[earlier.property.name], row[later.property.name]] as const)
            .map(([first, last]) => [first, instant(first), instant(last)] as const)
            .filter(
                (pair): pair is readonly [JsonValue, number, number] => pair[1] !== undefined && pair[2] !== undefined
            );
        const field = {
            entitySet: entity.entitySetName,
            property: earlier.property.name,
            related: `${entity.entitySetName}.${later.property.name}`
        };
        order.field({
            ...field,
            checked: both.length,
            failing: both.filter(([, first, last]) => first > last).map(([value]) => value)
        });
        if (earlier.marker === 'created') {
            const alwaysEqual =
                both.length >= rules().minimumPatternRows && both.every(([, first, last]) => first === last);
            identity.field({
                ...field,
                checked: both.length,
                failing: alwaysEqual ? both.map(([value]) => value) : []
            });
        }
    }
}

/**
 * Timestamps agree with the date and the time field of the same name, and a timestamp that names a time
 * is not midnight in every row.
 *
 * @param entity schema entity
 * @param rows generated rows
 * @param fields temporal and time fields of the entity
 * @param composition collector of findings
 */
function checkComposition(
    entity: SchemaEntity,
    rows: ReadonlyArray<MockDataRow>,
    fields: ReadonlyArray<TemporalField>,
    composition: OutcomeCollector
): void {
    for (const timestamp of fields.filter(({ property }) => TIMESTAMP_TYPES.has(property.primitiveType))) {
        const name = timestamp.property.name;
        const date = unique(
            fields,
            (field) => field.stem === timestamp.stem && field.property.primitiveType === 'date'
        );
        const time = unique(
            fields,
            (field) => field.stem === timestamp.stem && field.property.primitiveType === 'time'
        );
        const values = rows.map((row) => row[name]).filter((value): value is string => typeof value === 'string');
        const disagreeing = rows.filter((row) => {
            const value = row[name];
            if (typeof value !== 'string') {
                return false;
            }
            const dateValue = date ? row[date.property.name] : undefined;
            const timeValue = time ? timeOfDay(row[time.property.name]) : undefined;
            return (
                (typeof dateValue === 'string' && !value.startsWith(dateValue.slice(0, 10))) ||
                (timeValue !== undefined && timeOfDay(value) !== timeValue)
            );
        });
        const namesTime = identifierTokens(name, { lettersOnly: true }).some((token) => rules().clockWords.has(token));
        const alwaysMidnight =
            namesTime &&
            values.length >= rules().minimumPatternRows &&
            values.every((value) => timeOfDay(value) === '00:00:00');
        composition.field({
            entitySet: entity.entitySetName,
            property: name,
            checked: values.length,
            failing: alwaysMidnight ? values : disagreeing.map((row) => row[name])
        });
    }
}

/**
 * Ordering, identity and composition of dates and times.
 *
 * @param input check input
 * @returns one outcome per temporal check
 */
export function checkTemporal(input: RealismInput): {
    order: CheckOutcome;
    identity: CheckOutcome;
    composition: CheckOutcome;
} {
    const order = new OutcomeCollector(REALISM_CHECK.temporalOrder);
    const identity = new OutcomeCollector(REALISM_CHECK.temporalIdentity);
    const composition = new OutcomeCollector(REALISM_CHECK.temporalComposition);
    for (const entity of input.graph.entities) {
        const rows = generatedRows(input, entity.entitySetName);
        const fields = entity.properties
            .filter(({ primitiveType }) => TEMPORAL_TYPES.has(primitiveType) || primitiveType === 'time')
            .map(temporalField);
        const dated = fields.filter(({ property }) => TEMPORAL_TYPES.has(property.primitiveType));
        checkPairs(entity, rows, dated, order, identity);
        checkComposition(entity, rows, fields, composition);
    }
    return {
        order: order.outcome(),
        identity: identity.outcome(),
        composition: composition.outcome()
    };
}
