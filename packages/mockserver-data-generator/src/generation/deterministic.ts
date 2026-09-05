import { createHash } from 'node:crypto';
import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorDiagnostic,
    MockDataGeneratorOptions,
    MockDataRow,
    MockDataTarget,
    SemanticClassification
} from '../types.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../schema/graph.js';
import { semanticPropertyKey } from '../semantics/classifier.js';
import { semanticRowContext, semanticValue, type SemanticRowContext } from '../semantics/value-banks.js';
import { applySemanticCoherence } from './coherence.js';
import { propertyValueIsValid } from './constraints.js';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'] as const;

function routedRole(classification: SemanticClassification | undefined): string | undefined {
    if (
        !classification ||
        classification.role === 'unknown' ||
        classification.confidence < (classification.routeThreshold ?? 0.5)
    ) {
        return undefined;
    }
    return classification.role;
}

function stableNumber(value: string): number {
    return createHash('sha256').update(value).digest().readUInt32BE(0);
}

function humanize(value: string): string {
    return value
        .replace(/([a-z\d])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (character) => character.toUpperCase());
}

function truncate(value: string, maximumLength?: number): string {
    return maximumLength === undefined ? value : value.slice(0, maximumLength);
}

function uniqueEnumValues(property: SchemaProperty): ReadonlyArray<string | number | boolean> {
    return [...new Set(property.enumValues ?? [])];
}

function binaryOrdinal(ordinal: number, maximumLength?: number): string {
    if (maximumLength !== undefined && maximumLength < 4) {
        return '';
    }
    const hexadecimal = ordinal.toString(16).padStart(2, '0');
    return Buffer.from(hexadecimal.length % 2 === 0 ? hexadecimal : `0${hexadecimal}`, 'hex').toString('base64');
}

function keyValue(entity: SchemaEntity, property: SchemaProperty, ordinal: number, seed: number): JsonValue {
    const values = uniqueEnumValues(property);
    if (values.length > 0) {
        return values[ordinal % values.length];
    }
    switch (property.primitiveType) {
        case 'int':
            return ordinal + 1;
        case 'decimal': {
            const precision = Math.min(property.precision ?? 15, 15);
            const scale = Math.min(property.scale ?? 0, precision);
            return Number((ordinal / 10 ** scale).toFixed(scale));
        }
        case 'bool':
            return ordinal % 2 === 1;
        case 'guid': {
            const prefix = createHash('sha256')
                .update(`${seed}:${entity.entitySetName}:${property.name}`)
                .digest('hex');
            return `${prefix.slice(0, 8)}-${prefix.slice(8, 12)}-4${prefix.slice(13, 16)}-a${prefix.slice(
                17,
                20
            )}-${ordinal.toString(16).padStart(12, '0')}`;
        }
        case 'date':
            return new Date(Date.UTC(2000, 0, ordinal + 1)).toISOString().slice(0, 10);
        case 'datetime':
        case 'datetimeoffset':
            return new Date(Date.UTC(2000, 0, 1, 0, 0, ordinal)).toISOString();
        case 'time': {
            const hours = Math.floor(ordinal / 3_600);
            const minutes = Math.floor((ordinal % 3_600) / 60);
            const seconds = ordinal % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
                2,
                '0'
            )}`;
        }
        case 'binary':
            return binaryOrdinal(ordinal, property.maxLength);
        case 'string':
            return property.maxLength === undefined
                ? `K${ordinal.toString(36)}`
                : ordinal.toString(36).padStart(property.maxLength, '0').slice(-property.maxLength);
        default:
            throw new TypeError('Unsupported primitive key type');
    }
}

function stringValue(entity: SchemaEntity, property: SchemaProperty, rowIndex: number, hash: number): string {
    const evidence = `${property.name} ${property.label ?? ''}`.toLocaleLowerCase();
    if (evidence.includes('currency')) {
        return CURRENCIES[hash % CURRENCIES.length];
    }
    if (evidence.includes('name')) {
        return truncate(`${humanize(entity.name)} ${rowIndex + 1}`, property.maxLength);
    }
    if (evidence.includes('description')) {
        return truncate(`${humanize(entity.name)} description ${rowIndex + 1}`, property.maxLength);
    }
    if (evidence.includes('code')) {
        return truncate(`C${String((hash % 999) + 1).padStart(3, '0')}`, property.maxLength);
    }
    return truncate(`${humanize(property.name)} ${rowIndex + 1}`, property.maxLength);
}

function valueFor(
    entity: SchemaEntity,
    property: SchemaProperty,
    rowIndex: number,
    seed: number,
    role: string | undefined,
    rowContext: SemanticRowContext,
    keyOrdinal?: number
): JsonValue {
    const hash = stableNumber(`${seed}:${entity.entitySetName}:${property.name}:${rowIndex}`);
    if (property.isKey && keyOrdinal !== undefined) {
        return keyValue(entity, property, keyOrdinal, seed);
    }
    if (property.enumValues && property.enumValues.length > 0) {
        return property.enumValues[rowIndex % property.enumValues.length];
    }
    const governedValue = semanticValue(role, property, rowContext, hash);
    if (governedValue !== undefined && propertyValueIsValid(property, governedValue)) {
        return governedValue;
    }
    switch (property.primitiveType) {
        case 'int':
            return property.isKey ? rowIndex + 1 : hash % 10_000;
        case 'decimal': {
            const precision = Math.min(property.precision ?? 8, 15);
            const scale = Math.min(property.scale ?? 2, precision);
            const maximumScaled = Math.min(Number.MAX_SAFE_INTEGER, 10 ** precision - 1);
            return Number(((hash % (maximumScaled + 1)) / 10 ** scale).toFixed(scale));
        }
        case 'bool':
            return hash % 2 === 0;
        case 'guid': {
            const value = createHash('sha256')
                .update(`${seed}:${entity.entitySetName}:${property.name}:${rowIndex}`)
                .digest('hex');
            return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-a${value.slice(
                17,
                20
            )}-${value.slice(20, 32)}`;
        }
        case 'date':
            return new Date(Date.UTC(2020 + (hash % 6), hash % 12, (hash % 27) + 1)).toISOString().slice(0, 10);
        case 'datetime':
        case 'datetimeoffset':
            return new Date(Date.UTC(2020 + (hash % 6), hash % 12, (hash % 27) + 1, hash % 24)).toISOString();
        case 'time':
            return `${String(hash % 24).padStart(2, '0')}:${String(hash % 60).padStart(2, '0')}:00`;
        case 'binary':
            return Buffer.from(`${entity.name}:${rowIndex + 1}`).toString('base64');
        case 'string':
            return stringValue(entity, property, rowIndex, hash);
        default:
            throw new TypeError('Unsupported primitive property type');
    }
}

function finiteKeyCardinality(property: SchemaProperty): number | undefined {
    if (property.enumValues) {
        return uniqueEnumValues(property).length;
    }
    if (property.primitiveType === 'bool') {
        return 2;
    }
    if (property.primitiveType === 'string' && property.maxLength !== undefined) {
        if (property.maxLength === 0) {
            return 0;
        }
        return Math.min(1_001, 36 ** property.maxLength);
    }
    if (property.primitiveType === 'decimal' && property.precision !== undefined) {
        return property.precision >= 4 ? 1_001 : 10 ** property.precision;
    }
    if (property.primitiveType === 'time') {
        return 1_001;
    }
    if (property.primitiveType === 'binary' && property.maxLength !== undefined) {
        if (property.maxLength === 0) {
            return 0;
        }
        return property.maxLength < 4 ? 1 : 1_001;
    }
    return undefined;
}

function keyPlan(
    entity: SchemaEntity,
    requestedRows: number
): { rowCount: number; ordinals: ReadonlyMap<string, (rowIndex: number) => number> } {
    const keys = entity.properties.filter(({ isKey }) => isKey);
    const cardinalities = keys.map((property) => ({ property, cardinality: finiteKeyCardinality(property) }));
    const everyKeyFinite =
        cardinalities.length > 0 && cardinalities.every(({ cardinality }) => cardinality !== undefined);
    const capacity = everyKeyFinite
        ? cardinalities.reduce((product, { cardinality }) => Math.min(1_001, product * (cardinality as number)), 1)
        : requestedRows;
    let stride = 1;
    const ordinals = new Map<string, (rowIndex: number) => number>();
    for (const { property, cardinality } of cardinalities) {
        if (cardinality !== undefined && cardinality > 0) {
            const currentStride = stride;
            ordinals.set(property.name, (rowIndex) => Math.floor(rowIndex / currentStride) % cardinality);
            stride *= cardinality;
        } else if (cardinality === undefined) {
            ordinals.set(property.name, (rowIndex) => rowIndex);
        }
    }
    return { rowCount: Math.min(requestedRows, capacity), ordinals };
}

export interface DeterministicGenerationResult {
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>;
    diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic>;
}

function authoritativeTargetRows(
    relationship: SchemaGraph['relationships'][number],
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>>
): ReadonlyArray<MockDataRow> | undefined {
    const initialRows = existingData[relationship.toEntitySet]?.initialRows;
    return initialRows?.present === true &&
        (initialRows.source === 'json' || (initialRows.source === 'contributor' && initialRows.enumerable))
        ? initialRows.rows
        : resources[relationship.toEntitySet];
}

function relationshipAssignmentCandidates(
    relationship: SchemaGraph['relationships'][number],
    targetRows: ReadonlyArray<MockDataRow> | undefined,
    sourceEntity: SchemaEntity | undefined
): ReadonlyArray<Readonly<Record<string, JsonValue>>> {
    if (!targetRows || targetRows.length === 0) {
        const properties = new Map(sourceEntity?.properties.map((property) => [property.name, property]));
        return relationship.mappings.every(({ sourceProperty }) => properties.get(sourceProperty)?.nullable === true)
            ? [
                  Object.freeze(
                      Object.fromEntries(relationship.mappings.map(({ sourceProperty }) => [sourceProperty, null]))
                  )
              ]
            : [];
    }
    return targetRows.flatMap((targetRow) => {
        const entries = relationship.mappings.map(
            ({ sourceProperty, targetProperty }) => [sourceProperty, targetRow[targetProperty]] as const
        );
        return entries.some(([, value]) => value === undefined) ? [] : [Object.freeze(Object.fromEntries(entries))];
    });
}

function sameJsonValue(left: JsonValue, right: JsonValue): boolean {
    return Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);
}

interface IndexedRelationshipDomain {
    candidates: ReadonlyArray<Readonly<Record<string, JsonValue>>>;
    propertyNames: ReadonlyArray<string>;
    indexes: Map<string, ReadonlyMap<string, ReadonlyArray<Readonly<Record<string, JsonValue>>>>>;
}

interface RelationshipSearchBudget {
    steps: number;
    exhausted: boolean;
}

const MAX_RELATIONSHIP_SEARCH_STEPS = 2_000_000;

function valueSignature(value: JsonValue): string {
    return `${typeof value}:${JSON.stringify(value)}`;
}

function assignmentSignature(
    assignment: Readonly<Record<string, JsonValue>>,
    propertyNames: ReadonlyArray<string>
): string {
    return propertyNames.map((name) => `${name}=${valueSignature(assignment[name])}`).join('|');
}

function compareText(left: string, right: string): number {
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
}

function domainSignature(domain: IndexedRelationshipDomain): string {
    return `${domain.propertyNames.join('\u0000')}\u0001${domain.candidates
        .map((candidate) => assignmentSignature(candidate, domain.propertyNames))
        .join('\u0002')}`;
}

function compareDomains(left: IndexedRelationshipDomain, right: IndexedRelationshipDomain): number {
    return compareText(domainSignature(left), domainSignature(right));
}

function indexedRelationshipDomain(
    candidates: ReadonlyArray<Readonly<Record<string, JsonValue>>>
): IndexedRelationshipDomain {
    const propertyNames = Object.keys(candidates[0] ?? {}).sort(compareText);
    return {
        candidates: [...candidates].sort((left, right) =>
            compareText(assignmentSignature(left, propertyNames), assignmentSignature(right, propertyNames))
        ),
        propertyNames,
        indexes: new Map()
    };
}

function domainsOverlap(left: IndexedRelationshipDomain, right: IndexedRelationshipDomain): boolean {
    return left.propertyNames.some((name) => right.propertyNames.includes(name));
}

function connectedDomainComponents(
    domains: ReadonlyArray<IndexedRelationshipDomain>
): ReadonlyArray<ReadonlyArray<IndexedRelationshipDomain>> {
    const remaining = new Set([...domains].sort(compareDomains));
    const components: IndexedRelationshipDomain[][] = [];
    while (remaining.size > 0) {
        const first = remaining.values().next().value as IndexedRelationshipDomain;
        remaining.delete(first);
        const component = [first];
        for (let index = 0; index < component.length; index += 1) {
            const current = component[index];
            for (const candidate of [...remaining]) {
                if (domainsOverlap(current, candidate)) {
                    remaining.delete(candidate);
                    component.push(candidate);
                }
            }
        }
        components.push(component);
    }
    return components.sort((left, right) => compareDomains(left[0], right[0]));
}

function orderConnectedDomains(domains: ReadonlyArray<IndexedRelationshipDomain>): IndexedRelationshipDomain[] {
    const remaining = [...domains];
    remaining.sort((left, right) => {
        const leftDegree = domains.filter((candidate) => candidate !== left && domainsOverlap(left, candidate)).length;
        const rightDegree = domains.filter(
            (candidate) => candidate !== right && domainsOverlap(right, candidate)
        ).length;
        return (
            rightDegree - leftDegree || left.candidates.length - right.candidates.length || compareDomains(left, right)
        );
    });
    const ordered = [remaining.shift() as IndexedRelationshipDomain];
    const assignedNames = new Set(ordered[0].propertyNames);
    while (remaining.length > 0) {
        remaining.sort((left, right) => {
            const leftOverlap = left.propertyNames.filter((name) => assignedNames.has(name)).length;
            const rightOverlap = right.propertyNames.filter((name) => assignedNames.has(name)).length;
            return (
                rightOverlap - leftOverlap ||
                left.candidates.length - right.candidates.length ||
                compareDomains(left, right)
            );
        });
        const next = remaining.shift() as IndexedRelationshipDomain;
        next.propertyNames.forEach((name) => assignedNames.add(name));
        ordered.push(next);
    }
    return ordered;
}

function compatibleDomainCandidates(
    domain: IndexedRelationshipDomain,
    assignment: Readonly<Record<string, JsonValue>>,
    budget: RelationshipSearchBudget
): ReadonlyArray<Readonly<Record<string, JsonValue>>> {
    const sharedNames = domain.propertyNames.filter((name) => Object.prototype.hasOwnProperty.call(assignment, name));
    if (sharedNames.length === 0) {
        return domain.candidates;
    }
    const indexKey = sharedNames.join('\u0000');
    let index = domain.indexes.get(indexKey);
    if (!index) {
        const mutable = new Map<string, Array<Readonly<Record<string, JsonValue>>>>();
        for (const candidate of domain.candidates) {
            budget.steps += 1;
            if (budget.steps > MAX_RELATIONSHIP_SEARCH_STEPS) {
                budget.exhausted = true;
                return [];
            }
            const signature = assignmentSignature(candidate, sharedNames);
            const matches = mutable.get(signature) ?? [];
            matches.push(candidate);
            mutable.set(signature, matches);
        }
        index = new Map([...mutable].map(([signature, matches]) => [signature, Object.freeze(matches)]));
        domain.indexes.set(indexKey, index);
    }
    return index.get(assignmentSignature(assignment, sharedNames)) ?? [];
}

function findCompatibleRelationshipAssignment(
    domains: ReadonlyArray<IndexedRelationshipDomain>,
    rowIndex: number,
    budget: RelationshipSearchBudget,
    accept: (assignment: Readonly<Record<string, JsonValue>>) => boolean
): Readonly<Record<string, JsonValue>> | undefined {
    const ordered = connectedDomainComponents(domains).flatMap((component) => orderConnectedDomains(component));
    const assignment: Record<string, JsonValue> = {};
    const visit = (domainIndex: number): boolean => {
        if (domainIndex === ordered.length) {
            return accept(assignment);
        }
        const candidates = compatibleDomainCandidates(ordered[domainIndex], assignment, budget);
        for (let offset = 0; offset < candidates.length && !budget.exhausted; offset += 1) {
            budget.steps += 1;
            if (budget.steps > MAX_RELATIONSHIP_SEARCH_STEPS) {
                budget.exhausted = true;
                return false;
            }
            const candidate = candidates[(rowIndex + offset) % candidates.length];
            const entries = Object.entries(candidate);
            const added = entries.filter(([name]) => !Object.prototype.hasOwnProperty.call(assignment, name));
            entries.forEach(([name, value]) => (assignment[name] = value));
            if (visit(domainIndex + 1)) {
                return true;
            }
            added.forEach(([name]) => delete assignment[name]);
        }
        return false;
    };
    return visit(0) ? Object.freeze({ ...assignment }) : undefined;
}

/** Validate every generated relationship against the final authoritative parent domains. */
export function assertRelationshipIntegrity(
    graph: SchemaGraph,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    existingData: Readonly<Record<string, ExistingMockData>> = {}
): void {
    for (const relationship of graph.relationships) {
        const targetRows = authoritativeTargetRows(relationship, resources, existingData) ?? [];
        for (const sourceRow of resources[relationship.fromEntitySet] ?? []) {
            const sourceValues = relationship.mappings.map(({ sourceProperty }) => sourceRow[sourceProperty]);
            if (sourceValues.every((value) => value === null)) {
                continue;
            }
            const resolved = targetRows.some((targetRow) =>
                relationship.mappings.every(({ sourceProperty, targetProperty }) =>
                    sameJsonValue(sourceRow[sourceProperty], targetRow[targetProperty])
                )
            );
            if (!resolved) {
                throw new TypeError(`Generated relationship ${relationship.name} is not referentially valid`);
            }
        }
    }
}

function rowCount(target: MockDataTarget, entity: SchemaEntity, options: MockDataGeneratorOptions): number {
    if (target.kind === 'singleton') {
        return 1;
    }
    if (typeof options.rowsPerEntity === 'number') {
        return options.rowsPerEntity;
    }
    return options.rowsPerEntity?.[target.name] ?? options.rowsPerEntity?.[entity.name] ?? 5;
}

export function generateDeterministicResources(
    graph: SchemaGraph,
    targets: ReadonlyArray<MockDataTarget>,
    options: MockDataGeneratorOptions,
    classifications: ReadonlyMap<string, SemanticClassification> = new Map(),
    existingData: Readonly<Record<string, ExistingMockData>> = {}
): DeterministicGenerationResult {
    const entities = new Map(graph.entities.map((entity) => [entity.entitySetName, entity]));
    const resources: Record<string, Array<Record<string, JsonValue>>> = {};
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    for (const target of targets) {
        const entity = entities.get(target.name);
        if (!entity) {
            continue;
        }
        const requestedRows = rowCount(target, entity, options);
        const plannedKeys = keyPlan(entity, requestedRows);
        if (plannedKeys.rowCount < requestedRows) {
            diagnostics.push(
                Object.freeze({
                    code: 'ROW_COUNT_REDUCED_UNSATISFIABLE_KEY_DOMAIN',
                    severity: 'warning',
                    message: `Requested ${requestedRows} rows but the declared key domain supports ${plannedKeys.rowCount}.`,
                    target: target.name
                })
            );
        }
        const rows = Array.from({ length: plannedKeys.rowCount }, (_unused, rowIndex) => {
            const seed = options.seed ?? 1;
            const rowContext = semanticRowContext(stableNumber(`${seed}:${entity.entitySetName}:${rowIndex}`));
            return Object.fromEntries(
                entity.properties.map((property) => [
                    property.name,
                    valueFor(
                        entity,
                        property,
                        rowIndex,
                        seed,
                        routedRole(classifications.get(semanticPropertyKey(entity.entitySetName, property.name))),
                        rowContext,
                        plannedKeys.ordinals.get(property.name)?.(rowIndex)
                    )
                ])
            );
        });
        resources[target.name] = applySemanticCoherence(entity, rows, options.seed ?? 1).map((row) => ({ ...row }));
    }
    const baseResources = Object.fromEntries(
        Object.entries(resources).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))])
    );
    const relationshipsBySource = new Map<string, SchemaGraph['relationships'][number][]>();
    graph.relationships.forEach((relationship) => {
        const relationships = relationshipsBySource.get(relationship.fromEntitySet) ?? [];
        relationships.push(relationship);
        relationshipsBySource.set(relationship.fromEntitySet, relationships);
    });
    const diagnosticKeys = new Set(diagnostics.map(({ code, target }) => `${code}:${target ?? ''}`));
    const addDiagnostic = (diagnostic: MockDataGeneratorDiagnostic): void => {
        const key = `${diagnostic.code}:${diagnostic.target ?? ''}`;
        if (!diagnosticKeys.has(key)) {
            diagnosticKeys.add(key);
            diagnostics.push(Object.freeze(diagnostic));
        }
    };
    const sourceNames = [...relationshipsBySource.keys()].sort();
    const maximumPasses = Math.max(1, sourceNames.length + 1);
    for (let pass = 0; pass < maximumPasses; pass += 1) {
        let changed = false;
        for (const sourceName of sourceNames) {
            const relationships = relationshipsBySource.get(sourceName) ?? [];
            const sourceRows = resources[sourceName] ?? [];
            const sourceEntity = entities.get(sourceName);
            if (!sourceEntity || sourceRows.length === 0) {
                continue;
            }
            const domains = relationships.map((relationship) =>
                indexedRelationshipDomain(
                    relationshipAssignmentCandidates(
                        relationship,
                        authoritativeTargetRows(relationship, resources, existingData),
                        sourceEntity
                    )
                )
            );
            const budget: RelationshipSearchBudget = { steps: 0, exhausted: false };
            const keys = sourceEntity.properties.filter(({ isKey }) => isKey);
            const seenKeys = new Set<string>();
            const sourceBaseRows = (baseResources[sourceName] ?? []).slice(0, sourceRows.length);
            const resolvedRows = sourceBaseRows.flatMap((baseRow, rowIndex) => {
                const assignment = findCompatibleRelationshipAssignment(domains, rowIndex, budget, (candidate) => {
                    const candidateRow = { ...baseRow, ...candidate };
                    const candidateSignature = JSON.stringify(keys.map(({ name }) => candidateRow[name]));
                    return !seenKeys.has(candidateSignature);
                });
                if (!assignment) {
                    return [];
                }
                const row = { ...baseRow, ...assignment };
                const signature = JSON.stringify(keys.map(({ name: keyName }) => row[keyName]));
                if (seenKeys.has(signature)) {
                    return [];
                }
                seenKeys.add(signature);
                return [row];
            });
            if (budget.exhausted) {
                addDiagnostic({
                    code: 'ROW_COUNT_REDUCED_RELATIONSHIP_SEARCH_LIMIT',
                    severity: 'warning',
                    message: `Relationship planning reached its bounded search limit and retained ${resolvedRows.length} rows.`,
                    target: sourceName
                });
            }
            if (resolvedRows.length < sourceRows.length) {
                const missingReferenceDomain = domains.some(({ candidates }) => candidates.length === 0);
                addDiagnostic({
                    code: missingReferenceDomain
                        ? 'ROW_COUNT_REDUCED_UNSATISFIABLE_REFERENCE_DOMAIN'
                        : 'ROW_COUNT_REDUCED_UNSATISFIABLE_RELATIONSHIP_CONSTRAINTS',
                    severity: 'warning',
                    message: missingReferenceDomain
                        ? `A required parent domain is empty; retained ${resolvedRows.length} of ${sourceRows.length} rows.`
                        : `Relationship and key constraints retained ${resolvedRows.length} of ${sourceRows.length} rows.`,
                    target: sourceName
                });
            }
            if (JSON.stringify(resolvedRows) !== JSON.stringify(sourceRows)) {
                resources[sourceName] = resolvedRows;
                changed = true;
            }
        }
        if (!changed) {
            break;
        }
    }
    for (const [resourceName, rows] of Object.entries(resources)) {
        const entity = entities.get(resourceName);
        if (!entity) {
            continue;
        }
        const relationshipProperties = new Set(
            (relationshipsBySource.get(resourceName) ?? []).flatMap((relationship) =>
                relationship.mappings.map(({ sourceProperty }) => sourceProperty)
            )
        );
        resources[resourceName] = applySemanticCoherence(entity, rows, options.seed ?? 1, relationshipProperties).map(
            (row) => ({ ...row })
        );
    }
    const frozenResources = Object.freeze(
        Object.fromEntries(
            Object.entries(resources).map(([name, rows]) => {
                const entity = entities.get(name);
                if (entity) {
                    const keys = entity.properties.filter(({ isKey }) => isKey);
                    const seenKeys = new Set<string>();
                    for (const row of rows) {
                        for (const property of entity.properties) {
                            if (!propertyValueIsValid(property, row[property.name])) {
                                throw new TypeError(`Deterministic value violates ${name}.${property.name}`);
                            }
                        }
                        const signature = JSON.stringify(keys.map(({ name: keyName }) => row[keyName]));
                        if (seenKeys.has(signature)) {
                            throw new TypeError(`Deterministic generation produced a duplicate key for ${name}`);
                        }
                        seenKeys.add(signature);
                    }
                }
                return [name, Object.freeze(rows.map((row) => Object.freeze(row)))];
            })
        )
    );
    assertRelationshipIntegrity(graph, frozenResources, existingData);
    return Object.freeze({ resources: frozenResources, diagnostics: Object.freeze(diagnostics) });
}
