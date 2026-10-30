import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { generateServiceForTesting } from '../../src/index.js';
import { buildGeographyReferences } from '../../src/quality/geography-references.js';
import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import type { RealismCheck, RealismFinding } from '../../src/quality/realism.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import type { MockDataServiceRequest } from '../../src/types.js';

const require = createRequire(import.meta.url);
const geography = buildGeographyReferences({
    timeZones: require('cldr-bcp47/bcp47/timezone.json').keyword.u.tz,
    callingCodes: require('libphonenumber-js/metadata.min.json').country_calling_codes
});

const FIXTURES: ReadonlyArray<readonly ['edmx' | 'csn', string, '2.0' | '4.0', string?]> = [
    ['edmx', './travel-v2.metadata.xml', '2.0'],
    ['edmx', './finance-manage.metadata.xml', '2.0'],
    ['edmx', './synthetic-finance.metadata.xml', '4.0'],
    ['csn', './fixtures/bookshop.csn.json', '4.0', 'sap.capire.bookshop.CatalogService'],
    ['csn', './fixtures/bookshop.csn.json', '4.0', 'sap.capire.bookshop.AdminService']
];

let findings: RealismFinding[] = [];

/**
 * The fields of the fixtures that fail one check, as `fixture entitySet.property: examples`.
 *
 * @param check realism check
 * @returns failing fields
 */
const failingFields = (check: RealismCheck): string[] =>
    findings
        .filter((finding) => finding.check === check)
        .map(({ entitySet, property, examples }) => `${entitySet}.${property}: ${JSON.stringify(examples)}`);

beforeAll(async () => {
    for (const [format, file, odataVersion, alias] of FIXTURES) {
        const content = readFileSync(new URL(file, import.meta.url), 'utf8');
        const service = { urlPath: `/realism/${file}`, odataVersion, ...(alias ? { alias } : {}) };
        const graph = parseServiceMetadata({ format, content }, service);
        const request: MockDataServiceRequest = {
            metadata: { format, content },
            service,
            targets: [...new Set(graph.entities.map(({ entitySetName }) => entitySetName))].map((name) => ({
                name,
                kind: 'entity-set' as const
            })),
            existingData: {}
        };
        const result = await generateServiceForTesting(request, { mode: 'deterministic', rowsPerEntity: 10, seed: 1 });
        findings.push(...assessRealism({ graph, resources: result.resources, geography }).findings);
    }
}, 120_000);

afterAll(() => {
    findings = [];
});

/*
 * The hard realism invariants on the test fixtures, generated deterministically. A check marked `it.failing`
 * still fails on the fixtures; the workstream that fixes it turns it into `it` (Jest reports a failing test
 * that passes, so a fixed check cannot stay marked).
 */
describe('realism gate on the fixtures', () => {
    it('generates no placeholder', () => {
        expect(failingFields(REALISM_CHECK.placeholder)).toEqual([]);
    });

    it('leaks no service name into values', () => {
        expect(failingFields(REALISM_CHECK.nameLeak)).toEqual([]);
    });

    it('keeps texts a function of their codes and names free of codes', () => {
        expect(failingFields(REALISM_CHECK.codeText)).toEqual([]);
    });

    it("keeps every place field in the row's country", () => {
        expect(failingFields(REALISM_CHECK.geography)).toEqual([]);
    });

    it('never orders an earlier event after a later one', () => {
        expect(failingFields(REALISM_CHECK.temporalOrder)).toEqual([]);
    });
});
