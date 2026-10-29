import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsn } from '../../src/schema/csn.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type { SchemaGraph } from '../../src/schema/graph.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = join(PACKAGE_ROOT, 'src');
const RULES_ROOT = join(PACKAGE_ROOT, 'resources', 'rules');
/** Cited specification constants live here and are exempt. */
const SPEC_DIRECTORY = join(SOURCE_ROOT, 'spec') + sep;
/**
 * Fixture names the platform itself defines, so every service of that platform carries them:
 * - `SAP__Currencies` and `SAP__UnitsOfMeasure` are the code lists SAP Gateway adds to RAP services.
 * - `IsActiveEntity` and `HasDraftEntity` are the RAP draft administration fields.
 */
const PLATFORM_NAMES = new Set(['SAP__Currencies', 'SAP__UnitsOfMeasure', 'IsActiveEntity', 'HasDraftEntity']);

/**
 * The graphs of every fixture service the tests generate data for.
 *
 * @returns the parsed fixtures
 */
function fixtureGraphs(): SchemaGraph[] {
    const edmx = ['finance-manage', 'synthetic-finance', 'travel-v2'].map((name) =>
        parseEdmx(readFileSync(join(PACKAGE_ROOT, 'test', 'unit', `${name}.metadata.xml`), 'utf8'))
    );
    const csn = readFileSync(join(PACKAGE_ROOT, 'test', 'unit', 'fixtures', 'bookshop.csn.json'), 'utf8');
    return [...edmx, ...['AdminService', 'CatalogService'].map((alias) => parseCsn(csn, { alias }))];
}

/**
 * Whether a name has more than one word: a single word (`Name`, `City`) is vocabulary, not a fixture's name.
 *
 * @param name entity, entity set or property name
 * @returns true for compound names
 */
function isCompound(name: string): boolean {
    return name.includes('_') || (name.match(/[A-Z]?[a-z]+|[A-Z]+(?![a-z])|\d+/gu) ?? []).length > 1;
}

/**
 * The compound entity, entity set and property names of the fixtures, platform names left out.
 *
 * @param graphs the fixture graphs
 * @returns the names
 */
function fixtureNames(graphs: ReadonlyArray<SchemaGraph>): Set<string> {
    const names = graphs.flatMap((graph) =>
        graph.entities.flatMap((entity) => [
            entity.name,
            entity.entitySetName,
            ...entity.properties.map((property) => property.name)
        ])
    );
    return new Set(names.filter((name) => isCompound(name) && !PLATFORM_NAMES.has(name)));
}

/**
 * Every file under a directory.
 *
 * @param directory directory to walk
 * @returns absolute file paths
 */
function filesUnder(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
    });
}

/**
 * The names that occur as whole identifiers in a text.
 *
 * @param text file text
 * @param names the names to look for
 * @returns the names found
 */
function namesIn(text: string, names: ReadonlySet<string>): string[] {
    const identifiers = new Set(text.match(/[A-Za-z0-9_]+/gu) ?? []);
    return [...names].filter((name) => identifiers.has(name));
}

describe('fixture name boundary', () => {
    it('keeps the names of the fixture services out of the source code and the rule store', () => {
        // Given the compound names of every fixture service
        const names = fixtureNames(fixtureGraphs());
        // When the source outside src/spec and the rule store data are searched for them
        const files = [
            ...filesUnder(SOURCE_ROOT).filter((file) => file.endsWith('.ts') && !file.startsWith(SPEC_DIRECTORY)),
            ...filesUnder(RULES_ROOT).filter((file) => file.endsWith('.json'))
        ];
        const found = files.flatMap((file) =>
            namesIn(readFileSync(file, 'utf8'), names).map(
                (name) => `${relative(PACKAGE_ROOT, file).split(sep).join('/')}: ${name}`
            )
        );
        // Then none occurs: behaviour tuned to the services the tests use would not carry over to other services
        expect(found).toEqual([]);
    });

    it('still finds every platform name it exempts in a fixture', () => {
        // Given every name of the fixtures, compound or not
        const names = new Set(
            fixtureGraphs().flatMap((graph) =>
                graph.entities.flatMap((entity) => [
                    entity.name,
                    entity.entitySetName,
                    ...entity.properties.map((property) => property.name)
                ])
            )
        );
        // Then each exempt name occurs, so a stale exemption cannot hide a fixture's own name
        expect([...PLATFORM_NAMES].filter((name) => !names.has(name))).toEqual([]);
    });

    it('detects a compound fixture name in a text and ignores it inside a longer identifier', () => {
        // Given a compound name
        const names = new Set(['OrderItemNote']);
        // Then a whole identifier is found and a longer one is not
        expect(namesIn('const role = rules.get(`OrderItemNote`);', names)).toEqual(['OrderItemNote']);
        expect(namesIn('OrderItemNoteText', names)).toEqual([]);
        expect(isCompound('Name')).toBe(false);
        expect(isCompound('Order_ID')).toBe(true);
    });
});
