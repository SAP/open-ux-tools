import type {
    ExistingMockData,
    JsonValue,
    MockDataGeneratorOptions,
    MockDataGeneratorResult,
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest
} from '@sap-ux/mockserver-data-generator';

type UnknownRecord = Record<string, unknown>;

interface PersistenceEntity {
    qualifiedName: string;
    resourceName: string;
    keyNames: ReadonlyArray<string>;
    dependencies: ReadonlyArray<string>;
}

interface QueryBuilder {
    columns(...columns: string[]): QueryBuilder;
    limit(rows: number): unknown;
}

export interface CapQueryLanguage {
    SELECT: { from(entity: string): QueryBuilder };
    INSERT: {
        into(entity: string): { entries(rows: ReadonlyArray<UnknownRecord>): unknown };
    };
}

export interface CapTransaction {
    run(query: unknown): Promise<unknown>;
}

export interface CapDatabase {
    tx<T>(handler: (transaction: CapTransaction) => Promise<T>): Promise<T>;
}

export type GenerateService = (
    request: MockDataServiceRequest,
    options: MockDataGeneratorOptions,
    runtime: MockDataGeneratorRuntime
) => Promise<MockDataGeneratorResult>;

export interface SeedCapDatabaseOptions {
    csn: unknown;
    database: CapDatabase;
    queryLanguage: CapQueryLanguage;
    generate: GenerateService;
    options: MockDataGeneratorOptions;
    runtime: MockDataGeneratorRuntime;
    signal?: AbortSignal;
}

export interface CapSeedResult {
    inserted: ReadonlyArray<string>;
    preserved: ReadonlyArray<string>;
}

function isRecord(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function typeName(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function associationTarget(element: unknown): string | undefined {
    if (!isRecord(element)) {
        return undefined;
    }
    const type = typeName(element.type);
    return typeof element.target === 'string' && ['cds.Association', 'cds.Composition'].includes(type)
        ? element.target
        : undefined;
}

function localEntityName(qualifiedName: string): string {
    const parts = qualifiedName.split('.');
    return parts.length > 1 ? parts.slice(1).join('_') : qualifiedName;
}

function resourceNames(qualifiedNames: ReadonlyArray<string>): ReadonlyMap<string, string> {
    const counts = new Map<string, number>();
    for (const qualifiedName of qualifiedNames) {
        const local = localEntityName(qualifiedName);
        counts.set(local, (counts.get(local) ?? 0) + 1);
    }
    return new Map(
        qualifiedNames.map((qualifiedName) => {
            const local = localEntityName(qualifiedName);
            return [qualifiedName, counts.get(local) === 1 ? local : qualifiedName];
        })
    );
}

function persistenceEntities(csn: unknown): ReadonlyArray<PersistenceEntity> {
    if (!isRecord(csn) || !isRecord(csn.definitions)) {
        throw new TypeError('Resolved CAP model must contain CSN definitions');
    }
    const candidates = Object.entries(csn.definitions).filter(
        ([, definition]) =>
            isRecord(definition) &&
            definition.kind === 'entity' &&
            definition.query === undefined &&
            definition.projection === undefined &&
            definition['@cds.persistence.skip'] !== true &&
            definition['@cds.persistence.exists'] !== true
    ) as Array<[string, UnknownRecord]>;
    const names = new Set(candidates.map(([name]) => name));
    const localNames = resourceNames([...names]);
    return Object.freeze(
        candidates.map(([qualifiedName, definition]) => {
            const elements = isRecord(definition.elements) ? definition.elements : {};
            return Object.freeze({
                qualifiedName,
                resourceName: localNames.get(qualifiedName) ?? qualifiedName,
                keyNames: Object.entries(elements)
                    .filter(([, element]) => isRecord(element) && element.key === true && !associationTarget(element))
                    .map(([name]) => name)
                    .sort(),
                dependencies: [
                    ...new Set(
                        Object.values(elements)
                            .map(associationTarget)
                            .filter((target): target is string => typeof target === 'string')
                    )
                ]
                    .filter((target) => names.has(target))
                    .sort()
            });
        })
    );
}

function persistenceCsn(csn: unknown, entities: ReadonlyArray<PersistenceEntity>): string {
    if (!isRecord(csn) || !isRecord(csn.definitions)) {
        throw new TypeError('Resolved CAP model must contain CSN definitions');
    }
    const persistenceNames = new Set(entities.map(({ qualifiedName }) => qualifiedName));
    const definitions = Object.fromEntries(
        Object.entries(csn.definitions).filter(
            ([name, definition]) => !isRecord(definition) || definition.kind !== 'entity' || persistenceNames.has(name)
        )
    );
    return JSON.stringify({ ...csn, definitions });
}

function foreignKeyOrder(entities: ReadonlyArray<PersistenceEntity>): ReadonlyArray<PersistenceEntity> {
    const byName = new Map(entities.map((entity) => [entity.qualifiedName, entity]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const ordered: PersistenceEntity[] = [];
    const visit = (entity: PersistenceEntity): void => {
        if (visited.has(entity.qualifiedName)) {
            return;
        }
        if (visiting.has(entity.qualifiedName)) {
            return;
        }
        visiting.add(entity.qualifiedName);
        for (const dependency of entity.dependencies) {
            const parent = byName.get(dependency);
            if (parent) {
                visit(parent);
            }
        }
        visiting.delete(entity.qualifiedName);
        visited.add(entity.qualifiedName);
        ordered.push(entity);
    };
    [...entities].sort((left, right) => left.qualifiedName.localeCompare(right.qualifiedName)).forEach(visit);
    return Object.freeze(ordered);
}

function existingData(rows: ReadonlyArray<MockDataRow>): ExistingMockData {
    return Object.freeze({
        contributor: Object.freeze({ present: false as const }),
        initialRows:
            rows.length === 0
                ? Object.freeze({ source: 'none' as const, present: false as const })
                : Object.freeze({ source: 'json' as const, present: true as const, rows: Object.freeze(rows) })
    });
}

async function readExistingKeys(
    transaction: CapTransaction,
    queryLanguage: CapQueryLanguage,
    entity: PersistenceEntity
): Promise<ReadonlyArray<MockDataRow>> {
    let query = queryLanguage.SELECT.from(entity.qualifiedName);
    if (entity.keyNames.length > 0) {
        query = query.columns(...entity.keyNames);
    }
    const value = await transaction.run(query.limit(1_000));
    if (!Array.isArray(value)) {
        throw new TypeError(`CAP database read for ${entity.qualifiedName} did not return rows`);
    }
    return Object.freeze(
        value.filter(isRecord).map((row) => {
            if (!Object.values(row).every(isJsonValue)) {
                throw new TypeError(`CAP key read for ${entity.qualifiedName} returned a non-JSON value`);
            }
            return Object.freeze({ ...row }) as MockDataRow;
        })
    );
}

function isJsonValue(value: unknown): value is JsonValue {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
        return true;
    }
    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }
    return isRecord(value) && Object.values(value).every(isJsonValue);
}

/**
 * Seed only missing CAP persistence entities inside one transaction.
 *
 * @param input Seeding dependencies and resolved CSN.
 * @returns Inserted and preserved entity names.
 */
export async function seedCapDatabase(input: SeedCapDatabaseOptions): Promise<CapSeedResult> {
    const entities = foreignKeyOrder(persistenceEntities(input.csn));
    const metadata = persistenceCsn(input.csn, entities);
    const signal = input.signal ?? new AbortController().signal;
    return input.database.tx(async (transaction) => {
        const existing: Record<string, ExistingMockData> = {};
        const preserved = new Set<string>();
        for (const entity of entities) {
            signal.throwIfAborted();
            const rows = await readExistingKeys(transaction, input.queryLanguage, entity);
            existing[entity.resourceName] = existingData(rows);
            if (rows.length > 0) {
                preserved.add(entity.qualifiedName);
            }
        }
        const request: MockDataServiceRequest = {
            metadata: { format: 'csn', content: metadata },
            service: { urlPath: '/$mockserver-data-generator', alias: 'CAP', odataVersion: '4.0' },
            targets: entities
                .filter(({ qualifiedName }) => !preserved.has(qualifiedName))
                .map(({ resourceName }) => ({ name: resourceName, kind: 'entity-set' as const })),
            existingData: existing,
            signal
        };
        const result = await input.generate(request, input.options, input.runtime);
        const inserted: string[] = [];
        for (const entity of entities) {
            signal.throwIfAborted();
            if (preserved.has(entity.qualifiedName)) {
                continue;
            }
            const rows = result.resources[entity.resourceName] ?? [];
            if (rows.length === 0) {
                continue;
            }
            await transaction.run(
                input.queryLanguage.INSERT.into(entity.qualifiedName).entries(
                    rows.map((row) => ({ ...row })) as ReadonlyArray<UnknownRecord>
                )
            );
            inserted.push(entity.qualifiedName);
        }
        return Object.freeze({
            inserted: Object.freeze(inserted),
            preserved: Object.freeze([...preserved].sort())
        });
    });
}
