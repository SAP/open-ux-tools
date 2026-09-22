import type { SchemaGraph, SchemaProperty } from '../schema/graph.js';
import type { JsonValue, MockDataGeneratorDiagnostic, MockDataRow, SyntheticCoherenceRule } from '../types.js';
import { propertyValueIsValid } from './constraints.js';

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
const CREATED = new Set(['create', 'created', 'creation', 'crted', 'crt']);
const CHANGED = new Set(['change', 'changed', 'modified', 'updated', 'chgd', 'chg']);
const START = new Set(['start', 'starting', 'begin', 'beginning', 'from']);
const END = new Set(['end', 'ending', 'finish', 'until', 'to']);
const PREPARATION = new Set(['booking', 'reservation', 'order', 'request', 'registration']);
const EVENT = new Set(['event', 'execution', 'delivery', 'departure', 'arrival', 'service', 'flight', 'appointment']);

function words(property: SchemaProperty): string[] {
    return (property.label ?? property.name)
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(/[^a-z]+/u)
        .filter(Boolean);
}

function has(property: SchemaProperty, markers: ReadonlySet<string>): boolean {
    return words(property).some((word) => markers.has(word));
}

function diagnostic(code: string, constraint: TemporalConstraint, message: string): MockDataGeneratorDiagnostic {
    return {
        code,
        severity: code === 'SYNTHETIC_TEMPORAL_ASSUMPTION' ? 'info' : 'warning',
        target: constraint.resource,
        message: `${constraint.before} <= ${constraint.after}: ${message}`
    };
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
            [CREATED, CHANGED],
            [START, END]
        ]) {
            const signature = (property: SchemaProperty): string =>
                words(property)
                    .filter((word) => !early.has(word) && !late.has(word) && word !== 'last')
                    .join(':');
            for (const before of properties.filter((property) => has(property, early))) {
                const matches = properties.filter(
                    (property) => has(property, late) && signature(property) === signature(before)
                );
                if (matches.length === 1) {
                    add(before, matches[0]);
                }
            }
        }
        const preparation = properties.filter((property) => has(property, PREPARATION));
        const event = properties.filter(
            (property) =>
                has(property, EVENT) &&
                ![PREPARATION, CREATED, CHANGED, START, END].some((markers) => has(property, markers))
        );
        if (preparation.length === 1 && event.length === 1) {
            add(preparation[0], event[0]);
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
    for (let pass = 0; pass < plan.constraints.length; pass++) {
        for (const constraint of plan.constraints) {
            const entity = graph.entities.find(({ entitySetName }) => entitySetName === constraint.resource);
            const before = entity?.properties.find(({ name }) => name === constraint.before);
            const after = entity?.properties.find(({ name }) => name === constraint.after);
            if (!before || !after) {
                continue;
            }
            const fixed = (property: SchemaProperty): boolean =>
                property.isKey ||
                Boolean(property.enumValues?.length) ||
                Boolean(protectedProperties.get(constraint.resource)?.has(property.name));
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
    diagnostics.push(...validateTemporalPlan(graph, generated, explicit, coherence));
    return Object.freeze(
        Object.fromEntries(
            Object.entries(generated).map(([resource, rows]) => [
                resource,
                Object.freeze(rows.map((row) => Object.freeze(row)))
            ])
        )
    );
}
