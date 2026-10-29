import { generateServiceForTesting } from '../../src/index.js';
import { isNameForm, reconcileCodeTexts } from '../../src/generation/code-texts.js';
import { parseCsn } from '../../src/schema/csn.js';
import { parseServiceMetadata } from '../../src/schema/parse-metadata.js';
import { packagedBanks } from '../../src/semantics/bank-store.js';
import type {
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest,
    SemanticClassification
} from '../../src/types.js';

/**
 * An OData V4 service of the given entity types, one entity set per type named `<Type>s`.
 *
 * @param entityTypes entity type elements
 * @param types entity type names
 * @param existingData supplied rows
 * @returns the generation request
 */
function service(
    entityTypes: string,
    types: ReadonlyArray<string>,
    existingData: MockDataServiceRequest['existingData'] = {}
): MockDataServiceRequest {
    return {
        metadata: {
            format: 'edmx',
            content: `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
${entityTypes}
<EntityContainer Name="Container">${types.map((type) => `<EntitySet Name="${type}s" EntityType="Demo.${type}"/>`).join('')}</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`
        },
        service: { urlPath: '/code-text', odataVersion: '4.0' },
        targets: types.map((type) => ({ name: `${type}s`, kind: 'entity-set' as const })),
        existingData
    };
}

/**
 * A classifier that routes the named properties to fixed roles and abstains on the rest.
 *
 * @param roles role per property name
 * @returns the runtime
 */
function routing(roles: Readonly<Record<string, string>>): MockDataGeneratorRuntime {
    return {
        classifier: {
            fingerprint: 'code-text-test',
            classify: async (input): Promise<SemanticClassification> =>
                roles[input.propertyName]
                    ? { role: roles[input.propertyName], confidence: 1, source: 'classifier' }
                    : { role: 'unknown', confidence: 1, source: 'unknown', top: [{ role: 'unknown', confidence: 1 }] }
        }
    };
}

/**
 * The texts each code of a column pair has across rows.
 *
 * @param rows rows
 * @param code code column
 * @param text text column
 * @returns texts per code
 */
function textsByCode(rows: ReadonlyArray<MockDataRow>, code: string, text: string): Map<unknown, Set<unknown>> {
    const texts = new Map<unknown, Set<unknown>>();
    for (const row of rows) {
        texts.set(row[code], (texts.get(row[code]) ?? new Set()).add(row[text]));
    }
    return texts;
}

const options = { seed: 11, rowsPerEntity: 10 } as const;

describe('codes and their texts', () => {
    it('never fills the text of a code from a narrative bank and keeps one text per code', async () => {
        // Given a short category code whose declared text a classifier routes to the narrative description role
        const request = service(
            `<EntityType Name="Bank"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="BankCategory" Type="Edm.String" MaxLength="2"><Annotation Term="Common.Text" Path="BankCategoryDescription"/></Property>
<Property Name="BankCategoryDescription" Type="Edm.String" MaxLength="40"/>
</EntityType>`,
            ['Bank']
        );

        // When the service is generated
        const result = await generateServiceForTesting(
            request,
            options,
            routing({ BankCategoryDescription: 'description' })
        );

        // Then no text is a narrative bank value, and with nothing that names the codes every code has one
        // standard mock server text rather than an invented one
        const rows = result.resources.Banks;
        const narrative = new Set(packagedBanks().defaultSampleDataset.descriptions);
        expect(rows.filter((row) => narrative.has(String(row.BankCategoryDescription)))).toEqual([]);
        for (const texts of textsByCode(rows, 'BankCategory', 'BankCategoryDescription').values()) {
            expect([...texts]).toHaveLength(1);
            expect([...texts][0]).toMatch(/^BankCategoryDescription_\d+$/u);
        }
    });

    it('writes the language name as the text of a language code', async () => {
        // Given a correspondence language code whose declared text is its name
        const request = service(
            `<EntityType Name="Address"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="CorrespondenceLanguage" Type="Edm.String" MaxLength="2"><Annotation Term="Common.Text" Path="LanguageName"/></Property>
<Property Name="LanguageName" Type="Edm.String" MaxLength="40"/>
</EntityType>`,
            ['Address']
        );

        // When the service is generated with the code routed to the language role and the name to it as well
        const result = await generateServiceForTesting(
            request,
            options,
            routing({ CorrespondenceLanguage: 'language', LanguageName: 'language' })
        );

        // Then each name is the English name of its code
        const names = new Intl.DisplayNames('en', { type: 'language' });
        for (const row of result.resources.Addresss) {
            expect(row.LanguageName).toBe(names.of(String(row.CorrespondenceLanguage)));
        }
    });

    it('keeps the code shape for a code from a value list whose name does not say code', async () => {
        // Given a ten-character field that a value list governs
        const request = service(
            `<EntityType Name="Order"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Plant" Type="Edm.String" MaxLength="10"><Annotation Term="Common.ValueListReferences"><Collection><String>../plant/$metadata</String></Collection></Annotation></Property>
</EntityType>`,
            ['Order']
        );

        // When the service is generated without a model
        const result = await generateServiceForTesting(request, { ...options, mode: 'deterministic' });

        // Then every plant is a code, not an empty field
        expect(result.resources.Orders.every((row) => /^[A-Z]+\d+$/u.test(String(row.Plant)))).toBe(true);
    });

    it('treats an unannotated text sibling as the text of its code', async () => {
        // Given a group code and a group text with no annotation linking them
        const request = service(
            `<EntityType Name="Payment"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="PaymentGroup" Type="Edm.String" MaxLength="4"/>
<Property Name="PaymentGroupText" Type="Edm.String" MaxLength="40"/>
</EntityType>`,
            ['Payment']
        );

        // When the service is generated with the text routed to a narrative role
        const result = await generateServiceForTesting(request, options, routing({ PaymentGroupText: 'notes' }));

        // Then the sibling is treated as a text, not a narrative field: every code has one text, and with
        // nothing that names the codes it is the standard mock server text rather than an invented one
        for (const texts of textsByCode(result.resources.Payments, 'PaymentGroup', 'PaymentGroupText').values()) {
            expect(texts.size).toBe(1);
            expect([...texts][0]).toMatch(/^PaymentGroupText_\d+$/u);
        }
    });

    it('names a country code from the name role of its text when the code itself has no role', () => {
        // Given a country code with no role, its name routed to the country-name role, and a generated name
        // that belongs to another country
        const request = service(
            `<EntityType Name="Sale"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="SoldToCountry" Type="Edm.String" MaxLength="3"><Annotation Term="Common.Text" Path="SoldToCountryName"/></Property>
<Property Name="SoldToCountryName" Type="Edm.String" MaxLength="50"/>
</EntityType>`,
            ['Sale']
        );
        const graph = parseServiceMetadata(request.metadata, request.service);
        const rows = [
            { ID: 1, SoldToCountry: 'DE', SoldToCountryName: 'Austria' },
            { ID: 2, SoldToCountry: 'DE', SoldToCountryName: 'Austria' }
        ];

        // When the texts of codes are reconciled
        const { resources, written, named } = reconcileCodeTexts({
            graph,
            resources: { Sales: rows },
            existingData: {},
            classifications: new Map([
                ['Sales.SoldToCountryName', { role: 'country_name', source: 'classifier', confidence: 1 }]
            ])
        });

        // Then every row names the country of its code
        expect(resources.Sales.map((row) => row.SoldToCountryName)).toEqual(['Germany', 'Germany']);
        expect(written.get('Sales')).toEqual(new Set(['SoldToCountryName']));
        expect(named.get('Sales')).toEqual(new Set(['SoldToCountryName']));
    });

    it('reports a text copied from another row of its code as written but not as named', () => {
        // Given a code no record names, whose rows hold different generated texts
        const request = service(
            `<EntityType Name="Task"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Kind" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="KindText"/></Property>
<Property Name="KindText" Type="Edm.String" MaxLength="40"/>
</EntityType>`,
            ['Task']
        );
        const graph = parseServiceMetadata(request.metadata, request.service);

        // When the texts of codes are reconciled
        const { resources, written, named } = reconcileCodeTexts({
            graph,
            resources: {
                Tasks: [
                    { ID: 1, Kind: 'K1', KindText: 'Inspection' },
                    { ID: 2, Kind: 'K1', KindText: 'Repair' }
                ]
            },
            existingData: {},
            classifications: new Map()
        });

        // Then the code keeps its first text, which is written but names nothing
        expect(resources.Tasks.map((row) => row.KindText)).toEqual(['Inspection', 'Inspection']);
        expect(written.get('Tasks')).toEqual(new Set(['KindText']));
        expect(named.get('Tasks')).toBeUndefined();
    });

    it('keeps one text per value of a number code whose text is declared', async () => {
        // Given a readable number that names its description and repeats across rows
        const request = service(
            `<EntityType Name="Trip"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="TripNumber" Type="Edm.Byte"><Annotation Term="Common.Text" Path="Description"/></Property>
<Property Name="Description" Type="Edm.String" MaxLength="80"/>
</EntityType>`,
            ['Trip']
        );

        // When the service is generated with many rows, so numbers recur
        const result = await generateServiceForTesting(
            request,
            { ...options, rowsPerEntity: 300 },
            routing({ Description: 'description' })
        );

        // Then the description is a function of the number, and the number keeps the narrative role of a row
        const texts = textsByCode(result.resources.Trips, 'TripNumber', 'Description');
        expect([...texts.values()].some((values) => values.size === 1)).toBe(true);
        expect([...texts.values()].every((values) => values.size === 1)).toBe(true);
        expect(result.semanticRoles?.['Trips.Description']).toBe('description');
    });

    it('takes the text of a code from rows the caller supplied', async () => {
        // Given supplied rows that name category A
        const entityType = `<EntityType Name="Bank"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="BankCategory" Type="Edm.String" MaxLength="1"><Annotation Term="Common.Text" Path="BankCategoryText"/></Property>
<Property Name="BankCategoryText" Type="Edm.String" MaxLength="40"/>
</EntityType>`;
        const request = service(entityType, ['Bank'], {
            Banks: {
                contributor: { present: false },
                initialRows: {
                    source: 'json',
                    present: true,
                    rows: [{ ID: 100, BankCategory: 'A', BankCategoryText: 'Retail bank' }]
                }
            }
        });

        // When the service is generated with enough rows for category A to recur
        const result = await generateServiceForTesting(request, {
            ...options,
            mode: 'deterministic',
            rowsPerEntity: 60
        });

        // Then every generated row of category A carries the supplied text
        const categoryA = result.resources.Banks.filter((row) => row.BankCategory === 'A' && row.ID !== 100);
        expect(categoryA.length).toBeGreaterThan(0);
        expect(new Set(categoryA.map((row) => row.BankCategoryText))).toEqual(new Set(['Retail bank']));
    });
});

describe('CSN text annotations', () => {
    it('links a code to the element its @Common.Text path names', () => {
        // Given a CSN entity whose code element names its text element
        const graph = parseCsn(
            JSON.stringify({
                definitions: {
                    'Demo.Types': {
                        kind: 'entity',
                        elements: {
                            code: { type: 'cds.String', length: 4, key: true, '@Common.Text': { '=': 'name' } },
                            name: { type: 'cds.String', length: 40 }
                        }
                    }
                }
            })
        );

        // When the code is read, Then its text link names the text element
        const code = graph.entities[0]?.properties.find(({ name }) => name === 'code');
        expect(code?.links?.text).toBe('name');
    });
});

describe('isNameForm', () => {
    it('reads a text word only at a word boundary of the name', () => {
        // Given names ending in a text word, and one-word names that merely end in its letters
        const form = (name: string): boolean =>
            isNameForm({ name, primitiveType: 'string', nullable: true, isKey: false, annotations: [] });

        // Then only a last word that is a text word makes a name form
        expect(['LanguageName', 'PAYMENT_GROUP_TEXT', 'OrganizationName1'].map(form)).toEqual([true, true, true]);
        expect(['Context', 'Subtext', 'Name'].map(form)).toEqual([false, false, false]);
    });
});
