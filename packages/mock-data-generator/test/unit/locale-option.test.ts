import { generateServiceForTesting } from '../../src/index.js';
import { generateService, inspectService } from '../../src/public.js';
import type { MockDataServiceRequest } from '../../src/types.js';

const request: MockDataServiceRequest = {
    metadata: {
        format: 'edmx',
        content: `<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" Version="1.0"><edmx:DataServices><Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" xmlns:sap="http://www.sap.com/Protocols/SAPData" Namespace="Test"><EntityType Name="Customer"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/><Property Name="Country" Type="Edm.String" MaxLength="3" sap:semantics="country" sap:text="CountryName"/><Property Name="CountryName" Type="Edm.String" MaxLength="50" sap:label="Country name"/></EntityType><EntityContainer Name="Container"><EntitySet Name="Customers" EntityType="Test.Customer"/></EntityContainer></Schema></edmx:DataServices></edmx:Edmx>`
    },
    service: { urlPath: '/customers', odataVersion: '2.0' },
    targets: [{ name: 'Customers', kind: 'entity-set' }],
    existingData: {}
};

/**
 * The country names of generated rows, next to the names a locale gives their codes.
 *
 * @param rows the generated rows
 * @param locale the locale the names are expected in
 * @returns the generated and the expected names
 */
function countryNames(rows: ReadonlyArray<Record<string, unknown>>, locale: string) {
    const names = new Intl.DisplayNames(locale, { type: 'region' });
    return {
        generated: rows.map(({ CountryName }) => CountryName),
        expected: rows.map(({ Country }) => names.of(String(Country)))
    };
}

describe('the locale option', () => {
    it.each([
        ['de_DE', 'de-DE'],
        ['de-DE', 'de-DE']
    ])('names countries in the language of the locale %s', async (locale, canonical) => {
        // Given a locale written with an underscore or a hyphen
        // When customers are generated
        const result = await generateServiceForTesting(request, { locale, mode: 'deterministic', seed: 1 });

        // Then the country names are in that language, and nothing is reported about the locale
        const { generated, expected } = countryNames(result.resources.Customers, canonical);
        expect(generated).toEqual(expected);
        expect(result.diagnostics.map(({ code }) => code)).not.toContain('OPTION_LOCALE_UNSUPPORTED');
    });

    it.each(['', 'not a locale', 42])('generates in English and reports the unreadable locale %p', async (locale) => {
        // Given a locale the platform cannot read
        // When customers are generated
        const result = await generateServiceForTesting(request, {
            locale: locale as string,
            mode: 'deterministic',
            seed: 1
        });

        // Then the rows are generated with English country names, and the locale is reported
        const { generated, expected } = countryNames(result.resources.Customers, 'en');
        expect(result.resources.Customers.length).toBeGreaterThan(0);
        expect(generated).toEqual(expected);
        expect(
            result.diagnostics
                .filter(({ code }) => code === 'OPTION_LOCALE_UNSUPPORTED')
                .map(({ severity }) => severity)
        ).toEqual(['warning']);
    });

    it('reads en_US as en-US through the public API, for generation and inspection', async () => {
        // Given the underscore form many hosts pass
        const options = { locale: 'en_US', mode: 'deterministic' as const, seed: 1 };

        // When the service is generated and inspected through the public API
        const result = await generateService(request, options);
        const inspection = await inspectService(request, options);

        // Then both run in en-US, with nothing reported about the locale
        expect(result.resources.Customers.length).toBeGreaterThan(0);
        expect(result.diagnostics.map(({ code }) => code)).not.toContain('OPTION_LOCALE_UNSUPPORTED');
        expect(inspection.locale).toBe('en-US');
    });
});
