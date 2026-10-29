import { generateServiceForTesting } from '../../src/index.js';
import { anchorRowGeography } from '../../src/generation/row-geography.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import { packagedBanks } from '../../src/semantics/bank-store.js';
import type {
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest,
    SemanticClassification
} from '../../src/types.js';

/**
 * An OData V4 service from entity types and an entity container body.
 *
 * @param entityTypes entity type elements
 * @param container entity container elements
 * @param targets requested entity sets
 * @returns the generation request
 */
function service(entityTypes: string, container: string, targets: ReadonlyArray<string>): MockDataServiceRequest {
    return {
        metadata: {
            format: 'edmx',
            content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
${entityTypes}
<EntityContainer Name="Container">${container}</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`
        },
        service: { urlPath: '/geography', odataVersion: '4.0' },
        targets: targets.map((name) => ({ name, kind: 'entity-set' as const })),
        existingData: {}
    };
}

/**
 * Planned roles for the named properties of one entity set.
 *
 * @param entitySet entity set name
 * @param roles role per property name
 * @returns the classifications
 */
function plan(entitySet: string, roles: Readonly<Record<string, string>>): Map<string, SemanticClassification> {
    return new Map(
        Object.entries(roles).map(([name, role]) => [
            `${entitySet}.${name}`,
            { role, source: 'classifier' as const, confidence: 1 }
        ])
    );
}

/**
 * A classifier that routes properties by name to fixed roles and abstains on the rest.
 *
 * @param roles role per property name
 * @returns the runtime
 */
function routing(roles: Readonly<Record<string, string>>): MockDataGeneratorRuntime {
    return {
        classifier: {
            fingerprint: 'row-geography-test',
            classify: async (input): Promise<SemanticClassification> =>
                roles[input.propertyName]
                    ? { role: roles[input.propertyName], confidence: 1, source: 'classifier' }
                    : { role: 'unknown', confidence: 1, source: 'unknown', top: [{ role: 'unknown', confidence: 1 }] }
        }
    };
}

/**
 * The bank location of a country code.
 *
 * @param country ISO 3166 alpha-2 code
 * @returns the location record
 */
function locationOf(country: unknown) {
    return packagedBanks().locations.find((location) => location.country === country);
}

const BRANCH = `<EntityType Name="Country"><Key><PropertyRef Name="Code"/></Key>
<Property Name="Code" Type="Edm.String" MaxLength="3" Nullable="false"/>
</EntityType>
<EntityType Name="Branch"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="CountryCode" Type="Edm.String" MaxLength="3"/>
<Property Name="City" Type="Edm.String" MaxLength="40"/>
<Property Name="PostalCode" Type="Edm.String" MaxLength="10"/>
<Property Name="PhoneNumber" Type="Edm.String" MaxLength="30"/>
<Property Name="SWIFTCode" Type="Edm.String" MaxLength="11"/>
<Property Name="BankName" Type="Edm.String" MaxLength="60"/>
<Property Name="TimeZone" Type="Edm.String" MaxLength="40"/>
<NavigationProperty Name="to_Country" Type="Demo.Country"><ReferentialConstraint Property="CountryCode" ReferencedProperty="Code"/></NavigationProperty>
</EntityType>`;
const BRANCH_CONTAINER = `<EntitySet Name="Countries" EntityType="Demo.Country"/>
<EntitySet Name="Branches" EntityType="Demo.Branch"><NavigationPropertyBinding Path="to_Country" Target="Countries"/></EntitySet>`;
const BRANCH_ROLES = {
    Code: 'country',
    CountryCode: 'country',
    City: 'city',
    PostalCode: 'postal_code',
    PhoneNumber: 'phone',
    SWIFTCode: 'bic',
    BankName: 'bank_name',
    TimeZone: 'timezone'
};

describe('geography anchored on the row country', () => {
    it('draws the place, phone and time zone of a row from the country its reference supplies', async () => {
        // Given agencies whose country comes from a referenced country and whose place fields have roles
        const request = service(BRANCH, BRANCH_CONTAINER, ['Countries', 'Branches']);

        // When the service is generated
        const result = await generateServiceForTesting(request, { seed: 7, rowsPerEntity: 12 }, routing(BRANCH_ROLES));

        // Then every place field of the record belongs to that row's country
        expect(result.semanticRoles?.['Branches.BankName']).toBe('bank_name');
        const rows = result.resources.Branches;
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            const location = locationOf(row.CountryCode);
            expect(location).toBeDefined();
            expect(row.City).toBe(location?.city);
            expect(row.PostalCode).toBe(location?.postalCode);
            expect(String(row.PhoneNumber).startsWith(`${location?.phonePrefix} `)).toBe(true);
            expect(row.TimeZone).toBe(location?.timeZone);
            // And the bank, another party, is not assumed to be in the row's country: its name and BIC
            // name one bank
            expect(locationOf(String(row.SWIFTCode).slice(4, 6))?.bankName).toBe(row.BankName);
        }
    });
});

describe('anchorRowGeography', () => {
    // The country is an ordinary field here, not the end of a reference, so the pass may set it.
    const graph = parseServiceMetadata(
        service(
            BRANCH.replace(/<NavigationProperty[^]*?<\/NavigationProperty>/u, ''),
            '<EntitySet Name="Branches" EntityType="Demo.Branch"/>',
            ['Branches']
        ).metadata
    );
    const classifications = plan('Branches', BRANCH_ROLES);
    const row = (values: MockDataRow): MockDataRow => ({
        ID: 1,
        CountryCode: 'DE',
        City: 'Berlin',
        PostalCode: '10115',
        PhoneNumber: '+49 30 1234567',
        SWIFTCode: 'DEUTDEFF',
        BankName: 'Deutsche Bank',
        TimeZone: 'Europe/Berlin',
        ...values
    });

    it('keeps the rows the caller supplied as written', () => {
        // Given a supplied row whose city is not in its country
        const supplied = row({ ID: 5, CountryCode: 'US', City: 'Paris' });

        // When geography is anchored
        const { resources } = anchorRowGeography({
            graph,
            resources: { Branches: [supplied] },
            existingData: {
                Branches: {
                    contributor: { present: false },
                    initialRows: { source: 'json', present: true, rows: [supplied] }
                }
            },
            classifications,
            seed: 1
        });

        // Then the supplied row is unchanged
        expect(resources.Branches).toEqual([supplied]);
    });

    it('writes the offset of the row country when its zone name does not fit the field', () => {
        // Given a time zone field shorter than any IANA zone of the location bank
        const short = parseServiceMetadata(
            service(
                BRANCH.replace(/<NavigationProperty[^]*?<\/NavigationProperty>/u, '').replace(
                    '<Property Name="TimeZone" Type="Edm.String" MaxLength="40"/>',
                    '<Property Name="TimeZone" Type="Edm.String" MaxLength="6"/>'
                ),
                '<EntitySet Name="Branches" EntityType="Demo.Branch"/>',
                ['Branches']
            ).metadata
        );

        // When geography is anchored on a fixed country
        const { resources } = anchorRowGeography({
            graph: short,
            resources: { Branches: [row({ CountryCode: 'NO', TimeZone: 'CET' })] },
            existingData: {},
            classifications,
            seed: 1,
            projectedProperties: new Map([['Branches', new Set(['CountryCode'])]])
        });

        // Then the zone of the row's own place is written as its standard offset, not a zone of another place
        expect(resources.Branches[0].TimeZone).toBe('UTC+1');
    });

    it('sets a free country from a city another entity fixed', () => {
        // Given a generated row whose city was projected from another entity
        const { resources } = anchorRowGeography({
            graph,
            resources: { Branches: [row({ CountryCode: 'DE', City: 'Oslo' })] },
            existingData: {},
            classifications,
            seed: 1,
            projectedProperties: new Map([['Branches', new Set(['City'])]])
        });

        // Then the country and the other place fields follow the city
        const [anchored] = resources.Branches;
        expect(anchored.City).toBe('Oslo');
        expect(anchored.CountryCode).toBe('NO');
        expect(String(anchored.PhoneNumber).startsWith(`${locationOf('NO')?.phonePrefix} `)).toBe(true);
    });

    it('leaves place fields empty for a fixed country no location knows', () => {
        // Given a projected country outside the location bank
        const { resources } = anchorRowGeography({
            graph,
            resources: { Branches: [row({ CountryCode: 'BR' })] },
            existingData: {},
            classifications,
            seed: 1,
            projectedProperties: new Map([['Branches', new Set(['CountryCode'])]])
        });

        // Then no place field claims another country
        const [anchored] = resources.Branches;
        expect(anchored.CountryCode).toBe('BR');
        for (const name of ['City', 'PostalCode', 'PhoneNumber', 'TimeZone']) {
            expect(anchored[name]).toBeNull();
        }
    });

    it('anchors each place field on the country field that shares its context', () => {
        // Given an entity with a bank country and an address country
        const twoCountries = parseServiceMetadata(
            service(
                `<EntityType Name="Partner"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Country" Type="Edm.String" MaxLength="3"/>
<Property Name="City" Type="Edm.String" MaxLength="40"/>
<Property Name="BankCountry" Type="Edm.String" MaxLength="3"/>
<Property Name="BankSWIFTCode" Type="Edm.String" MaxLength="11"/>
</EntityType>`,
                '<EntitySet Name="Partners" EntityType="Demo.Partner"/>',
                ['Partners']
            ).metadata
        );

        // When geography is anchored on fixed countries
        const { resources } = anchorRowGeography({
            graph: twoCountries,
            resources: {
                Partners: [{ ID: 1, Country: 'FR', City: 'Berlin', BankCountry: 'CH', BankSWIFTCode: 'DEUTDEFF' }]
            },
            existingData: {},
            classifications: plan('Partners', {
                Country: 'country',
                City: 'city',
                BankCountry: 'country',
                BankSWIFTCode: 'bic'
            }),
            seed: 1,
            projectedProperties: new Map([['Partners', new Set(['Country', 'BankCountry'])]])
        });

        // Then the city follows the address country and the bank code the bank country it shares a word with
        const [anchored] = resources.Partners;
        expect(anchored.City).toBe(locationOf('FR')?.city);
        expect(String(anchored.BankSWIFTCode).slice(4, 6)).toBe('CH');
    });
});

describe('geography and code texts together', () => {
    it('keeps a bank name the text of a bank key and in one bank with its BIC', async () => {
        // Given a bank entity whose name is the text of its bank key, with a country and a BIC
        const request = service(
            `<EntityType Name="Bank"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="BankCountry" Type="Edm.String" MaxLength="3"/>
<Property Name="BankKey" Type="Edm.String" MaxLength="15"><Annotation Term="Common.Text" Path="BankName"/></Property>
<Property Name="BankName" Type="Edm.String" MaxLength="60"/>
<Property Name="BankSWIFTCode" Type="Edm.String" MaxLength="11"/>
</EntityType>`,
            '<EntitySet Name="Banks" EntityType="Demo.Bank"/>',
            ['Banks']
        );

        // When the service is generated
        const result = await generateServiceForTesting(
            request,
            { seed: 5, rowsPerEntity: 20 },
            routing({ BankCountry: 'country', BankName: 'bank_name', BankSWIFTCode: 'bic' })
        );

        // Then each bank key has one name, and each name and BIC name one bank of the row's country
        const rows = result.resources.Banks;
        const names = new Map<unknown, Set<unknown>>();
        rows.forEach((row) => names.set(row.BankKey, (names.get(row.BankKey) ?? new Set()).add(row.BankName)));
        expect([...names.values()].every((set) => set.size === 1)).toBe(true);
        const named = rows.filter((candidate) => typeof candidate.BankName === 'string' && candidate.BankName !== '');
        expect(named.length).toBeGreaterThan(0);
        expect(result.semanticRoles?.['Banks.BankName']).toBe('bank_name');
        for (const row of named) {
            expect(locationOf(String(row.BankSWIFTCode).slice(4, 6))?.bankName).toBe(row.BankName);
            expect(locationOf(row.BankCountry)?.bankName).toBe(row.BankName);
        }
    });
});
