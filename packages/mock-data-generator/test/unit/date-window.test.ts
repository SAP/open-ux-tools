import { createDateWindow, DEFAULT_DATE_WINDOW, validateDateWindowOptions } from '../../src/date-window.js';
import { generateServiceForTesting } from '../../src/index.js';
import { semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';
import type { MockDataGeneratorOptions } from '../../src/types.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
<EntityType Name="Slot"><Key><PropertyRef Name="Day"/></Key>
<Property Name="Day" Type="Edm.Date" Nullable="false"/>
<Property Name="Alpha" Type="Edm.Date"/>
<Property Name="Beta" Type="Edm.DateTimeOffset"/>
</EntityType>
<EntityContainer Name="Container"><EntitySet Name="Slots" EntityType="Demo.Slot"/></EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const DAY_MS = 86_400_000;

/**
 * The generated slot rows for options.
 *
 * @param options generation options
 * @returns the rows
 */
async function slots(options: MockDataGeneratorOptions): Promise<ReadonlyArray<Record<string, unknown>>> {
    const result = await generateServiceForTesting(
        {
            metadata: { format: 'edmx', content: metadata },
            service: { urlPath: '/slots', odataVersion: '4.0' },
            targets: [{ name: 'Slots', kind: 'entity-set' }],
            existingData: {}
        },
        { seed: 5, rowsPerEntity: 20, mode: 'deterministic', ...options }
    );
    return result.resources.Slots;
}

describe('date window', () => {
    it('defaults to the six calendar years from 2020-01-01 the generator always used', () => {
        expect(DEFAULT_DATE_WINDOW).toEqual({ startMs: Date.UTC(2020, 0, 1), startYear: 2020, years: 6, days: 2_192 });
    });

    it.each([
        ['2024-07-01', 2, 730],
        ['2020-02-29', 1, 366],
        ['1999-12-31', 1, 366]
    ])('counts calendar days from %s over %i years', (referenceDate, years, days) => {
        expect(createDateWindow(referenceDate, years).days).toBe(days);
    });

    it.each([
        ['an impossible day', '2020-02-30', undefined, /reference date/u],
        ['a short month', '2020-1-01', undefined, /reference date/u],
        ['a non-string date', 20_200_101, undefined, /reference date/u],
        ['a two-digit year', '0050-01-01', undefined, /reference date/u],
        ['zero years', undefined, 0, /window years/u],
        ['too many years', undefined, 101, /window years/u],
        ['fractional years', undefined, 1.5, /window years/u],
        ['textual years', undefined, '6', /window years/u]
    ])('rejects %s', (_case, referenceDate, windowYears, message) => {
        expect(() => validateDateWindowOptions(referenceDate, windowYears)).toThrow(message);
    });

    it('rejects an invalid window before generating', async () => {
        await expect(slots({ windowYears: 0 })).rejects.toThrow(/window years must be an integer between 1 and 100/u);
    });

    it('keeps the former value-bank start years and identifiers under the default window', () => {
        // Given many row hashes under the default window
        const daysOfJanuary = new Set<number>();
        for (let hash = 0; hash < 20_000; hash += 7) {
            // Then the start year and the UII year follow the former fixed years
            const start = semanticRowContext(hash).startDate;
            expect(start.getUTCFullYear()).toBe(2021 + (hash % 5));
            if (start.getUTCMonth() === 0) {
                daysOfJanuary.add(start.getUTCDate());
            }
            expect(
                semanticValue(
                    'unique_item_identifier',
                    { name: 'Uii', primitiveType: 'string', nullable: false, isKey: false, annotations: [] },
                    semanticRowContext(hash),
                    hash
                )
            ).toBe(`UII-${2021 + (hash % 6)}-${String(hash % 1_000_000).padStart(6, '0')}`);
        }
        // And every day of a month occurs, not only a few
        expect(daysOfJanuary.size).toBe(31);
    });

    it('moves the value-bank start dates into the years after the reference year', () => {
        // Given a two-year and a one-year window
        const twoYears = createDateWindow('2040-05-01', 2);
        const oneYear = createDateWindow('2040-05-01', 1);
        for (let hash = 0; hash < 500; hash += 1) {
            // Then the start dates fall in the year after the reference year, or in it for a one-year window
            expect(semanticRowContext(hash, undefined, undefined, twoYears).startDate.getUTCFullYear()).toBe(2041);
            expect(semanticRowContext(hash, undefined, undefined, oneYear).startDate.getUTCFullYear()).toBe(2040);
        }
    });

    it('draws typed and key dates from the configured window', async () => {
        // Given a window of two years from 2031-03-15
        const startMs = Date.UTC(2031, 2, 15);
        const endMs = Date.UTC(2033, 2, 15);
        // When rows are generated with the window and with the defaults
        const configured = await slots({ referenceDate: '2031-03-15', windowYears: 2 });
        const defaults = await slots({});
        // Then the typed dates fall in the window and the keys start in it, one day apart
        for (const row of configured) {
            for (const name of ['Alpha', 'Beta']) {
                const time = Date.parse(String(row[name]));
                expect(time).toBeGreaterThanOrEqual(startMs);
                expect(time).toBeLessThan(endMs);
            }
            const key = Date.parse(String(row.Day));
            expect(key).toBeGreaterThanOrEqual(startMs);
            expect(key).toBeLessThan(endMs + configured.length * DAY_MS);
        }
        // And the default rows stay in 2020-01-01 to 2025-12-31
        for (const row of defaults) {
            const time = Date.parse(String(row.Alpha));
            expect(time).toBeGreaterThanOrEqual(Date.UTC(2020, 0, 1));
            expect(time).toBeLessThan(Date.UTC(2026, 0, 1));
        }
        expect(configured).not.toEqual(defaults);
    });
});
