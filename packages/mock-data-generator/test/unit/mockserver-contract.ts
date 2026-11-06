import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { MockDataRow } from '../../src/types.js';

const SERVER_SCRIPT = fileURLToPath(new URL('./mockserver-contract-server.mjs', import.meta.url));

/** A navigation as the mockserver reads it from the metadata. */
interface ServedNavigation {
    readonly name: string;
    readonly isCollection: boolean;
    readonly containsTarget: boolean;
    /** The qualified name of the target entity type. */
    readonly targetType?: string;
    readonly matchable: boolean;
}

/** An entity type as the mockserver reads it from the metadata. */
interface ServedEntityType {
    /** The qualified name of the entity type. */
    readonly name: string;
    readonly keys: ReadonlyArray<{ readonly name: string; readonly type: string }>;
    readonly navigations: ReadonlyArray<ServedNavigation>;
}

/** An entity set as the mockserver reads it from the metadata. */
interface ServedEntitySet {
    readonly name: string;
    /** The qualified name of the entity set's type. */
    readonly type: string;
    readonly keys: ReadonlyArray<{ readonly name: string; readonly type: string }>;
    readonly navigations: ReadonlyArray<ServedNavigation>;
    readonly draft: boolean;
    /** Whether the set is parametrized (`Common.ResultContext`): read by its parameters, never listed. */
    readonly parametrized: boolean;
}

/** The line the mockserver process prints once it serves the folder. */
interface ServedService {
    readonly port: number;
    readonly entitySets: ReadonlyArray<ServedEntitySet>;
    /** The entity types another entity type contains, by qualified name. */
    readonly containedTypes: Readonly<Record<string, ServedEntityType>>;
}

/**
 * Whether a parsed line is the service description the mockserver process prints.
 *
 * @param value the parsed line
 * @returns true for a service description
 */
function isServedService(value: unknown): value is ServedService {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof Reflect.get(value, 'port') === 'number' &&
        Array.isArray(Reflect.get(value, 'entitySets'))
    );
}

/** What a List Report → Object Page app reads, and which reads failed. */
export interface ObjectPageReplay {
    /** Rows the list reads returned. */
    readonly listed: number;
    /** Listed rows, and rows contained in them, whose single read by key did not return the row (the object page stays empty). */
    readonly unreadable: ReadonlyArray<string>;
    /** Listed rows that say they have a draft whose `SiblingEntity` read fails (the app opens an empty draft). */
    readonly missingSiblings: ReadonlyArray<string>;
    /** Listed rows of a draft-enabled set that are drafts: generated data holds active rows only. */
    readonly draftRows: ReadonlyArray<string>;
    /**
     * To-many navigations of a listed row, and containment navigations of a listed or contained row, that return
     * no rows: the object page table or section stays empty.
     */
    readonly emptyChildren: ReadonlyArray<string>;
    /** To-many navigations replayed. */
    readonly childReads: number;
    /** Containment navigations replayed, at any depth. */
    readonly containedReads: number;
    /** To-many navigations whose constraint reads a property their source does not declare: no data fills them. */
    readonly unmatchable: ReadonlyArray<string>;
}

const DRAFT_NAVIGATIONS = new Set(['DraftAdministrativeData', 'SiblingEntity']);
const DRAFT_ADMINISTRATIVE_DATA_TYPE = 'draftadministrativedata';

/**
 * The URL literal of a key value, as UI5 writes it into a key predicate.
 *
 * @param type the key's EDM type
 * @param value the key value
 * @param odataVersion the service's OData version
 * @returns the literal, URL-encoded
 */
function keyLiteral(type: string, value: unknown, odataVersion: '2.0' | '4.0'): string {
    const text = String(value);
    if (type === 'Edm.String') {
        return encodeURIComponent(`'${text.replaceAll("'", "''")}'`);
    }
    if (type === 'Edm.Guid' && odataVersion === '2.0') {
        return `guid'${text}'`;
    }
    return encodeURIComponent(text);
}

/**
 * The key predicate of a row, as UI5 writes it after an entity set or a containment navigation.
 *
 * @param keys the keys of the row's entity type
 * @param row the row
 * @param odataVersion the service's OData version
 * @returns the predicate, without parentheses
 */
function keyPredicate(
    keys: ReadonlyArray<{ readonly name: string; readonly type: string }>,
    row: Readonly<Record<string, unknown>>,
    odataVersion: '2.0' | '4.0'
): string {
    return keys.map(({ name, type }) => `${name}=${keyLiteral(type, row[name], odataVersion)}`).join(',');
}

/**
 * The rows of a collection response in either OData version.
 *
 * @param body the parsed response
 * @returns the rows, or an empty list
 */
function collectionRows(body: unknown): ReadonlyArray<Record<string, unknown>> {
    if (typeof body !== 'object' || body === null) {
        return [];
    }
    const value = Reflect.get(body, 'value');
    if (Array.isArray(value)) {
        return value;
    }
    const results = Reflect.get(Reflect.get(body, 'd') ?? {}, 'results');
    return Array.isArray(results) ? results : [];
}

/**
 * Whether a single-entity response holds a row with every key: a mockserver answers a read it cannot match
 * with a 404 or, in later releases, with an empty object, and the object page stays empty either way.
 *
 * @param response the read
 * @param response.status the HTTP status
 * @param response.body the parsed body
 * @param keys the entity set's keys
 * @returns true when the read returned a row
 */
function returnedRow(
    response: { status: number; body: unknown },
    keys: ReadonlyArray<{ readonly name: string }>
): boolean {
    if (response.status !== 200 || typeof response.body !== 'object' || response.body === null) {
        return false;
    }
    const row = Reflect.get(response.body, 'd') ?? response.body;
    return typeof row === 'object' && row !== null && keys.every(({ name }) => Reflect.get(row, name) !== undefined);
}

/**
 * Serve generated rows with the SAP Fiori elements mockserver and replay what a List Report → Object Page app
 * reads: each draft-enabled set through the Fiori elements draft filter, each parametrized set by the parameters
 * of its rows, and every other set plainly, every
 * listed row by its key, the draft sibling of every row that says it has one, every to-many navigation of
 * every listed row that data can fill, and every row the listed rows contain, at any depth.
 *
 * @param metadata the service metadata (EDMX)
 * @param resources the rows by entity set, as written to the mock data folder
 * @param odataVersion the service's OData version
 * @returns the reads and the failed ones
 */
export async function replayObjectPages(
    metadata: string,
    resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>,
    odataVersion: '2.0' | '4.0'
): Promise<ObjectPageReplay> {
    const folder = mkdtempSync(join(tmpdir(), 'mockserver-contract-'));
    writeFileSync(join(folder, 'metadata.xml'), metadata);
    for (const [entitySet, rows] of Object.entries(resources)) {
        writeFileSync(join(folder, `${entitySet}.json`), JSON.stringify(rows));
    }
    const child = spawn(process.execPath, [SERVER_SCRIPT, folder], { stdio: ['ignore', 'pipe', 'ignore'] });
    try {
        const served = await new Promise<ServedService>((resolve, reject) => {
            child.once('exit', (code) => reject(new Error(`The mockserver process ended with code ${String(code)}`)));
            createInterface({ input: child.stdout }).on('line', (line) => {
                try {
                    const parsed: unknown = JSON.parse(line);
                    if (isServedService(parsed)) {
                        resolve(parsed);
                    }
                } catch {
                    // The mockserver logs other lines; only the service description is JSON.
                }
            });
        });
        const read = async (path: string): Promise<{ status: number; body: unknown }> => {
            const response = await fetch(`http://localhost:${served.port}/contract/${path}`, {
                headers: { accept: 'application/json' }
            });
            const text = await response.text();
            try {
                return { status: response.status, body: JSON.parse(text) };
            } catch {
                return { status: response.status, body: undefined };
            }
        };
        const unreadable: string[] = [];
        const missingSiblings: string[] = [];
        const draftRows: string[] = [];
        const emptyChildren: string[] = [];
        const unmatchable = new Set<string>();
        let listed = 0;
        let childReads = 0;
        let containedReads = 0;
        /**
         * Replays the reads of the rows a row contains, as an object page section or table reads them: each
         * containment navigation, each contained row by its key, and the rows each of those contains. A navigation
         * to a type that already contains it on the path may end without rows, since its nesting is finite.
         *
         * @param path the path of the containing row
         * @param navigations the navigations of the containing row's type
         * @param containing the qualified names of the types on the path
         */
        const replayContained = async (
            path: string,
            navigations: ReadonlyArray<ServedNavigation>,
            containing: ReadonlySet<string>
        ): Promise<void> => {
            for (const navigation of navigations) {
                const type = navigation.targetType ? served.containedTypes[navigation.targetType] : undefined;
                if (!navigation.containsTarget || type === undefined || DRAFT_NAVIGATIONS.has(navigation.name)) {
                    continue;
                }
                containedReads += 1;
                const recursive = containing.has(type.name);
                const inner = new Set([...containing, type.name]);
                if (!navigation.isCollection) {
                    // A to-one read of a missing contained row returns a blank row; an expand returns no row.
                    // The mockserver stores a to-one containment as a list of at most one row, as an object too.
                    const expanded = await read(`${path}?$expand=${navigation.name}`);
                    const body: unknown = expanded.status === 200 ? expanded.body : undefined;
                    const container = typeof body === 'object' && body !== null ? (Reflect.get(body, 'd') ?? body) : {};
                    const contained: unknown = Reflect.get(container, navigation.name);
                    const held: unknown = Array.isArray(contained) ? contained[0] : contained;
                    if (!returnedRow({ status: 200, body: held }, type.keys)) {
                        if (!recursive) {
                            emptyChildren.push(`${path}/${navigation.name}`);
                        }
                    } else if (returnedRow(await read(`${path}/${navigation.name}`), type.keys)) {
                        await replayContained(`${path}/${navigation.name}`, type.navigations, inner);
                    } else {
                        unreadable.push(`${path}/${navigation.name}`);
                    }
                    continue;
                }
                const response = await read(`${path}/${navigation.name}`);
                const rows = response.status === 200 ? collectionRows(response.body) : [];
                if (rows.length === 0 && !recursive) {
                    emptyChildren.push(`${path}/${navigation.name}`);
                }
                for (const row of type.keys.length > 0 ? rows : []) {
                    const rowPath = `${path}/${navigation.name}(${keyPredicate(type.keys, row, odataVersion)})`;
                    if (returnedRow(await read(rowPath), type.keys)) {
                        await replayContained(rowPath, type.navigations, inner);
                    } else {
                        unreadable.push(rowPath);
                    }
                }
            }
        };
        for (const entitySet of served.entitySets) {
            const keys = entitySet.keys;
            // The draft administration rows are the mockserver's own, written when a draft is created.
            if (
                (resources[entitySet.name]?.length ?? 0) === 0 ||
                keys.length === 0 ||
                entitySet.type.toLowerCase().includes(DRAFT_ADMINISTRATIVE_DATA_TYPE)
            ) {
                continue;
            }
            const draft = entitySet.draft;
            const filter = draft
                ? `?$filter=${encodeURIComponent('(IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null)')}`
                : '';
            const rows = entitySet.parametrized
                ? (resources[entitySet.name] ?? [])
                : collectionRows((await read(`${entitySet.name}${filter}`)).body);
            for (const row of rows) {
                listed += 1;
                const path = `${entitySet.name}(${keyPredicate(keys, row, odataVersion)})`;
                if (draft && row.IsActiveEntity === false) {
                    draftRows.push(path);
                }
                // A parametrized set answers no direct read: an app reads only the results its parameters contain.
                if (!entitySet.parametrized && !returnedRow(await read(path), keys)) {
                    unreadable.push(path);
                    continue;
                }
                const hasSibling = entitySet.navigations.some(({ name }) => name === 'SiblingEntity');
                if (
                    hasSibling &&
                    row.HasDraftEntity === true &&
                    !returnedRow(await read(`${path}/SiblingEntity`), keys)
                ) {
                    missingSiblings.push(path);
                }
                await replayContained(path, entitySet.navigations, new Set([entitySet.type]));
                for (const navigation of entitySet.navigations) {
                    if (
                        !navigation.isCollection ||
                        navigation.containsTarget ||
                        DRAFT_NAVIGATIONS.has(navigation.name)
                    ) {
                        continue;
                    }
                    if (!navigation.matchable) {
                        unmatchable.add(`${entitySet.name}/${navigation.name}`);
                        continue;
                    }
                    childReads += 1;
                    const children = await read(`${path}/${navigation.name}`);
                    if (children.status === 200 && collectionRows(children.body).length === 0) {
                        emptyChildren.push(`${path}/${navigation.name}`);
                    }
                }
            }
        }
        return {
            listed,
            unreadable,
            missingSiblings,
            draftRows,
            emptyChildren,
            childReads,
            containedReads,
            unmatchable: [...unmatchable]
        };
    } finally {
        child.kill();
        rmSync(folder, { recursive: true, force: true });
    }
}
