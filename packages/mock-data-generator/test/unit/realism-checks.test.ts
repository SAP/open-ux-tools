import { assessRealism, REALISM_CHECK } from '../../src/quality/realism.js';
import type { GeographyReferences, RealismCheck } from '../../src/quality/realism.js';
import type { SchemaEntity, SchemaGraph, SchemaProperty } from '../../src/schema/graph.js';
import type { MockDataRow } from '../../src/types.js';

const property = (name: string, extra: Partial<SchemaProperty> = {}): SchemaProperty => ({
    name,
    primitiveType: 'string',
    nullable: true,
    isKey: false,
    annotations: [],
    ...extra
});

const entity = (entitySetName: string, properties: SchemaProperty[]): SchemaEntity => ({
    name: `${entitySetName}Type`,
    entitySetName,
    properties: [property('ID', { isKey: true }), ...properties]
});

const graphOf = (...entities: SchemaEntity[]): SchemaGraph => ({ namespace: 'test', entities, relationships: [] });

const rowsOf = (count: number, row: (index: number) => Record<string, string | number | null>): MockDataRow[] =>
    Array.from({ length: count }, (_, index) => ({ ID: `K${index}`, ...row(index) }));

const failing = (
    graph: SchemaGraph,
    resources: Record<string, MockDataRow[]>,
    check: RealismCheck,
    geography?: GeographyReferences
) =>
    assessRealism({ graph, resources, geography })
        .findings.filter((finding) => finding.check === check)
        .map(({ entitySet, property: name, failingCells }) => `${entitySet}.${name}:${failingCells}`);

describe('realism checks', () => {
    describe('placeholders', () => {
        it('flags a service name followed by a number and a column counting up a service name', () => {
            // Given a field whose values echo another field's name, and a column counting up a one-word field name
            const graph = graphOf(
                entity('Address', [property('TaxJurisdiction'), property('CareOf'), property('Remark')])
            );
            const resources = {
                Address: rowsOf(5, (index) => ({
                    TaxJurisdiction: `Jurisdiction ${index + 1}`,
                    CareOf: `Remark ${index + 1}`
                }))
            };
            // When the rows are checked, Then both fields fail in every row
            expect(failing(graph, resources, REALISM_CHECK.placeholder)).toEqual([
                'Address.CareOf:5',
                'Address.TaxJurisdiction:5'
            ]);
        });

        it('accepts a column counting up a prefix that names nothing in the service', () => {
            // Given floors counted up in a location field
            const graph = graphOf(entity('Address', [property('Location')]));
            const resources = { Address: rowsOf(5, (index) => ({ Location: `Floor ${index + 1}` })) };
            // When the rows are checked, Then nothing fails: a counted value is data unless it echoes a name
            expect(failing(graph, resources, REALISM_CHECK.placeholder)).toEqual([]);
        });

        it('accepts numbered values that are not service names, one-word names with a number, and enumeration members', () => {
            // Given street addresses, a room repeated in rows, a phone prefix and an enumeration member that looks numbered
            const graph = graphOf(
                entity('Address', [
                    property('Street'),
                    property('AssetRoom'),
                    property('Fax'),
                    property('Grade', { enumValues: ['Level 1'] })
                ])
            );
            const resources = {
                Address: rowsOf(4, (index) => ({
                    Street: ['Hill Street 4', 'Main Road 12', 'Oak Lane', 'Elm Way 7'][index],
                    AssetRoom: 'Room 14',
                    Fax: '+1 672',
                    Grade: 'Level 1'
                }))
            };
            // When the rows are checked, Then nothing fails
            expect(failing(graph, resources, REALISM_CHECK.placeholder)).toEqual([]);
        });
    });

    describe('name leaks', () => {
        it('flags a value that is the name of another property', () => {
            // Given a field holding the technical name of a sibling field
            const graph = graphOf(entity('Mapping', [property('TransactionType'), property('LastChangedByUser')]));
            const resources = {
                Mapping: rowsOf(3, () => ({ TransactionType: 'LastChangedByUser', LastChangedByUser: 'JSMITH' }))
            };
            // When the rows are checked, Then the field fails
            expect(failing(graph, resources, REALISM_CHECK.nameLeak)).toEqual(['Mapping.TransactionType:3']);
        });
    });

    describe('shared texts', () => {
        it('flags unrelated fields filled from the same list and accepts fields about the same subject', () => {
            // Given a category description and a user description sharing generic texts, and two city fields sharing cities
            const graph = graphOf(
                entity('Bank', [property('CategoryDescription'), property('CityName')]),
                entity('User', [property('UserDescription'), property('DeviatingCityName')])
            );
            const texts = ['Valve repair', 'Safety check', 'Pump inspection'];
            const cities = ['New York', 'San Jose', 'Rio Branco'];
            const resources = {
                Bank: rowsOf(3, (index) => ({ CategoryDescription: texts[index], CityName: cities[index] })),
                User: rowsOf(3, (index) => ({ UserDescription: texts[index], DeviatingCityName: cities[index] }))
            };
            // When the rows are checked, Then only the descriptions fail
            expect(failing(graph, resources, REALISM_CHECK.sharedText)).toEqual([
                'Bank.CategoryDescription:3',
                'User.UserDescription:3'
            ]);
        });

        it('accepts a name and a description of the same entity sharing values', () => {
            // Given a texts entity whose name and descr fields both hold currency names
            const graph = graphOf(entity('CurrencyTexts', [property('name'), property('descr')]));
            const names = ['US Dollar', 'Pound Sterling', 'Japanese Yen'];
            const resources = { CurrencyTexts: rowsOf(3, (index) => ({ name: names[index], descr: names[index] })) };
            // When the rows are checked, Then nothing fails
            expect(failing(graph, resources, REALISM_CHECK.sharedText)).toEqual([]);
        });
    });

    describe('code texts', () => {
        it('flags a text that changes for one code and a name field holding codes', () => {
            // Given a code whose text differs between rows, and a language name holding language codes
            const graph = graphOf(
                entity('Bank', [
                    property('Category', { maxLength: 2, links: { text: 'CategoryText' } }),
                    property('CategoryText', { maxLength: 40 }),
                    property('LanguageName', { maxLength: 40 })
                ])
            );
            const resources = {
                Bank: rowsOf(4, (index) => ({
                    Category: 'A',
                    CategoryText: index < 2 ? 'Retail' : 'Central',
                    LanguageName: ['ES', 'PT', 'DE', 'IT'][index]
                }))
            };
            // When the rows are checked, Then both text fields fail in every row
            expect(failing(graph, resources, REALISM_CHECK.codeText)).toEqual([
                'Bank.CategoryText:4',
                'Bank.LanguageName:4'
            ]);
        });

        it('accepts a text that is a function of its code', () => {
            const graph = graphOf(
                entity('Bank', [property('Category', { links: { text: 'CategoryText' } }), property('CategoryText')])
            );
            const resources = {
                Bank: rowsOf(4, (index) => ({
                    Category: index % 2 ? 'A' : 'B',
                    CategoryText: index % 2 ? 'Retail' : 'Central'
                }))
            };
            expect(failing(graph, resources, REALISM_CHECK.codeText)).toEqual([]);
        });

        it('does not pair texts with empty codes', () => {
            // Given rows whose code was left empty and whose texts differ
            const graph = graphOf(
                entity('Bank', [property('Category', { links: { text: 'CategoryText' } }), property('CategoryText')])
            );
            const resources = { Bank: rowsOf(4, (index) => ({ Category: '', CategoryText: `Text ${'ABCD'[index]}` })) };
            // When the rows are checked, Then the empty code is no code, and nothing fails
            expect(failing(graph, resources, REALISM_CHECK.codeText)).toEqual([]);
        });
    });

    describe('temporal', () => {
        const dated = graphOf(
            entity('Partner', [
                property('CreatedDate', { primitiveType: 'date' }),
                property('CreatedTime', { primitiveType: 'time' }),
                property('CreatedDateTime', { primitiveType: 'datetimeoffset' }),
                property('ChangedDateTime', { primitiveType: 'datetimeoffset' }),
                property('ValidFrom', { primitiveType: 'date' }),
                property('ValidTo', { primitiveType: 'date' })
            ])
        );

        it('flags reversed validity, a change equal to the creation in every row, a midnight timestamp next to a real time', () => {
            // Given rows with the defects the generator produced
            const resources = {
                Partner: rowsOf(5, (index) => ({
                    CreatedDate: `2023-02-0${index + 1}`,
                    CreatedTime: '12:49:00',
                    CreatedDateTime: `2023-02-0${index + 1}T00:00:00.000Z`,
                    ChangedDateTime: `2023-02-0${index + 1}T00:00:00.000Z`,
                    ValidFrom: '2024-01-01',
                    ValidTo: '2023-01-01'
                }))
            };
            // When the rows are checked, Then each defect is reported on its field
            expect(failing(dated, resources, REALISM_CHECK.temporalOrder)).toEqual(['Partner.ValidFrom:5']);
            expect(failing(dated, resources, REALISM_CHECK.temporalIdentity)).toEqual(['Partner.CreatedDateTime:5']);
            expect(failing(dated, resources, REALISM_CHECK.temporalComposition)).toEqual([
                'Partner.ChangedDateTime:5',
                'Partner.CreatedDateTime:5'
            ]);
        });

        it('accepts consistent dates and times', () => {
            const resources = {
                Partner: rowsOf(5, (index) => ({
                    CreatedDate: `2023-02-0${index + 1}`,
                    CreatedTime: `1${index}:49:00`,
                    CreatedDateTime: `2023-02-0${index + 1}T1${index}:49:00.000Z`,
                    ChangedDateTime: `2023-03-0${index + 1}T08:15:00.000Z`,
                    ValidFrom: '2022-01-01',
                    ValidTo: '2024-01-01'
                }))
            };
            for (const check of [
                REALISM_CHECK.temporalOrder,
                REALISM_CHECK.temporalIdentity,
                REALISM_CHECK.temporalComposition
            ]) {
                expect(failing(dated, resources, check)).toEqual([]);
            }
        });
    });

    describe('geography', () => {
        const references: GeographyReferences = {
            regions: new Set(['US', 'DE', 'IE', 'FI']),
            callingCodes: new Map([
                ['1', new Set(['US'])],
                ['49', new Set(['DE'])],
                ['353', new Set(['IE'])]
            ]),
            cityRegions: new Map([
                ['dublin', new Set(['IE'])],
                ['berlin', new Set(['DE'])],
                ['new york', new Set(['US'])]
            ]),
            zoneRegions: new Map([['Europe/Berlin', new Set(['DE'])]])
        };
        const graph = graphOf(
            entity('Bank', [property('BankCountry'), property('City'), property('Swift'), property('Phone')])
        );

        it('flags a city, bank identifier and phone number from another country than the row', () => {
            // Given a US bank with an Irish city, a German bank identifier and an Irish phone number
            const resources = {
                Bank: rowsOf(3, () => ({
                    BankCountry: 'US',
                    City: 'Dublin',
                    Swift: 'DEUTDEFF',
                    Phone: '+353 1 234567'
                }))
            };
            // When the rows are checked against the references, Then all three fields fail
            expect(failing(graph, resources, REALISM_CHECK.geography, references)).toEqual([
                'Bank.City:3',
                'Bank.Phone:3',
                'Bank.Swift:3'
            ]);
        });

        it('accepts geography that agrees with the row and skips the check without references', () => {
            const resources = {
                Bank: rowsOf(3, () => ({
                    BankCountry: 'DE',
                    City: 'Berlin',
                    Swift: 'DEUTDEFF',
                    Phone: '+49 30 1234567'
                }))
            };
            expect(failing(graph, resources, REALISM_CHECK.geography, references)).toEqual([]);
            const mismatched = {
                Bank: rowsOf(3, () => ({ BankCountry: 'US', City: 'Dublin', Swift: 'DEUTDEFF', Phone: '+353 1' }))
            };
            expect(failing(graph, mismatched, REALISM_CHECK.geography)).toEqual([]);
        });
    });

    describe('references across entity sets', () => {
        const referencing = (): SchemaGraph => ({
            namespace: 'test',
            entities: [
                entity('Qa', [property('Qb', { links: { text: 'Qc' } }), property('Qc')]),
                {
                    name: 'QdType',
                    entitySetName: 'Qd',
                    properties: [property('Qb', { isKey: true, links: { text: 'Qe' } }), property('Qe')]
                }
            ],
            relationships: [
                {
                    name: 'toQd',
                    fromEntitySet: 'Qa',
                    toEntitySet: 'Qd',
                    mappings: [{ sourceProperty: 'Qb', targetProperty: 'Qb' }],
                    provenance: 'inferred',
                    confidence: 0.8
                }
            ]
        });

        it('flags a referencing text that differs from the text of the referenced row', () => {
            // Given rows whose text field disagrees with the referenced row in two of three rows
            const resources = {
                Qa: rowsOf(3, (index) => ({ Qb: `R${index}`, Qc: index === 0 ? 'Alpha' : 'Other' })),
                Qd: ['Alpha', 'Beta', 'Gamma'].map((text, index) => ({ Qb: `R${index}`, Qe: text }))
            };
            // When the rows are checked, Then the two disagreeing cells fail
            expect(failing(referencing(), resources, REALISM_CHECK.referenceText)).toEqual(['Qa.Qc:2']);
        });

        it("does not judge a self-reference whose text field is the row's own text", () => {
            // Given a hierarchy whose parent reference carries the text of the row's own key
            const graph: SchemaGraph = {
                namespace: 'test',
                entities: [
                    {
                        name: 'QhType',
                        entitySetName: 'Qh',
                        properties: [
                            property('Qi', { isKey: true, links: { text: 'Qj' } }),
                            property('Qk', { links: { text: 'Qj' } }),
                            property('Qj')
                        ]
                    }
                ],
                relationships: [
                    {
                        name: 'toParent',
                        fromEntitySet: 'Qh',
                        toEntitySet: 'Qh',
                        mappings: [{ sourceProperty: 'Qk', targetProperty: 'Qi' }],
                        provenance: 'explicit',
                        confidence: 1
                    }
                ]
            };
            const resources = {
                Qh: ['Alpha', 'Beta', 'Gamma'].map((text, index) => ({
                    Qi: `R${index}`,
                    Qk: `R${(index + 1) % 3}`,
                    Qj: text
                }))
            };
            // When the rows are checked, Then the text is read as the row's own and nothing fails
            expect(failing(graph, resources, REALISM_CHECK.referenceText)).toEqual([]);
        });

        it('does not judge references whose referenced set was not generated', () => {
            // Given referencing rows and no rows of the referenced set
            const resources = { Qa: rowsOf(3, (index) => ({ Qb: `R${index}`, Qc: 'Other' })) };
            // When the rows are checked, Then nothing is examined
            const assessment = assessRealism({ graph: referencing(), resources });
            expect(assessment.coverage[REALISM_CHECK.referenceText]).toEqual({ fields: 0, cells: 0 });
        });
    });

    describe('semantic keys', () => {
        const keyed = (): SchemaGraph => ({
            namespace: 'test',
            entities: [
                { ...entity('Qa', [property('Qk'), property('Qb')]), semanticKey: ['Qk'] },
                entity('Qd', [property('Qa'), property('Qk')])
            ],
            relationships: [
                {
                    name: 'toQa',
                    fromEntitySet: 'Qd',
                    toEntitySet: 'Qa',
                    mappings: [{ sourceProperty: 'Qa', targetProperty: 'ID' }],
                    provenance: 'explicit',
                    confidence: 1
                }
            ]
        });

        it('flags a repeated semantic key that differs from the referenced row', () => {
            // Given children repeating their parent's semantic key, one of three wrongly
            const resources = {
                Qa: rowsOf(3, (index) => ({ Qk: `S${index}` })),
                Qd: rowsOf(3, (index) => ({ Qa: `K${index}`, Qk: index === 2 ? 'S0' : `S${index}` }))
            };
            // When the rows are checked, Then the one wrong copy fails
            expect(failing(keyed(), resources, REALISM_CHECK.referenceCopy)).toEqual(['Qd.Qk:1']);
        });

        it('flags rows that share a semantic key', () => {
            // Given four rows, two of which share their semantic key
            const resources = { Qa: rowsOf(4, (index) => ({ Qk: index === 3 ? 'S0' : `S${index}` })) };
            // When the rows are checked, Then the repeated row fails
            expect(failing(keyed(), resources, REALISM_CHECK.semanticKeyUnique)).toEqual(['Qa.Qk:1']);
        });

        it('flags a generated row that shares its semantic key with a supplied row', () => {
            // Given a supplied row and three generated rows, one of which repeats the supplied semantic key
            const resources = { Qa: rowsOf(4, (index) => ({ Qk: index === 3 ? 'S0' : `S${index}` })) };
            const assessment = assessRealism({ graph: keyed(), resources, isSupplied: (_set, index) => index === 0 });
            // When the rows are checked, Then the generated row fails
            expect(
                assessment.findings
                    .filter(({ check }) => check === REALISM_CHECK.semanticKeyUnique)
                    .map(({ entitySet, property: name, failingCells }) => `${entitySet}.${name}:${failingCells}`)
            ).toEqual(['Qa.Qk:1']);
        });
    });

    describe('identifiers', () => {
        const identified = (targetCardinality: 'one' | 'many'): SchemaGraph => ({
            namespace: 'test',
            entities: [
                {
                    ...entity('Qa', [property('ID', { isKey: true }), property('Qc'), property('Qr'), property('Qs')]),
                    alternateKeys: [['Qc']]
                },
                entity('Qd', [property('ID', { isKey: true }), property('Qr'), property('Qs')])
            ],
            relationships: [
                {
                    name: 'toQa',
                    fromEntitySet: 'Qd',
                    toEntitySet: 'Qa',
                    mappings: [
                        { sourceProperty: 'Qr', targetProperty: 'Qr' },
                        { sourceProperty: 'Qs', targetProperty: 'Qs' }
                    ],
                    provenance: 'explicit',
                    confidence: 1,
                    targetCardinality
                }
            ]
        });

        it('flags rows that share an alternate key or the properties a to-one reference selects by', () => {
            // Given rows whose alternate key repeats once and whose referenced properties repeat once
            const resources = {
                Qa: rowsOf(4, (index) => ({
                    Qc: index === 3 ? 'C0' : `C${index}`,
                    Qr: index === 2 ? 'R1' : `R${index}`,
                    Qs: 'S'
                })),
                Qd: rowsOf(2, () => ({ Qr: 'R0', Qs: 'S' }))
            };
            // When the rows are checked, Then each repeated identifier fails once
            expect(failing(identified('one'), resources, REALISM_CHECK.identifierUnique)).toEqual([
                'Qa.Qc:1',
                'Qa.Qr:1'
            ]);
        });

        it('lets the properties a to-many navigation selects children by repeat', () => {
            // Given rows whose referenced properties repeat, read through a to-many navigation
            const resources = { Qa: rowsOf(3, (index) => ({ Qc: `C${index}`, Qr: 'R', Qs: 'S' })) };
            // When the rows are checked, Then nothing fails
            expect(failing(identified('many'), resources, REALISM_CHECK.identifierUnique)).toEqual([]);
        });
    });

    describe('record rows', () => {
        it('flags a country code or name column that names another country than the row key', () => {
            // Given a country entity keyed by region codes with a second code column and a name column
            const graph = graphOf({
                name: 'QxType',
                entitySetName: 'Qx',
                properties: [property('Qk', { isKey: true }), property('Qa'), property('Qn')]
            });
            const codes = ['DE', 'FR', 'IT', 'ES', 'NL'];
            const names = new Intl.DisplayNames('en', { type: 'region' });
            const resources = {
                Qx: codes.map((code, index) => ({
                    Qk: code,
                    Qa: index === 0 ? 'FR' : code,
                    Qn: names.of(code) ?? ''
                }))
            };
            // When the rows are checked, Then the one row whose second code names another country fails
            expect(failing(graph, resources, REALISM_CHECK.recordConsistency)).toEqual(['Qx.Qa:1']);
        });
    });

    describe('unit fields', () => {
        const units = new Set(['KGM', 'kg', 'MTR', 'm', 'h']);
        const measured = (unitAnnotation: string) =>
            graphOf(
                entity('Qm', [
                    property('Qv', {
                        primitiveType: 'decimal',
                        links: { unit: 'Qu' },
                        annotations: [{ term: unitAnnotation, value: 'Qu' }]
                    }),
                    property('Qu')
                ])
            );
        const unitsFailing = (graph: SchemaGraph, values: string[]) =>
            assessRealism({
                graph,
                resources: { Qm: rowsOf(values.length, (index) => ({ Qu: values[index] })) },
                units
            })
                .findings.filter(({ check }) => check === REALISM_CHECK.unitField)
                .map(({ entitySet, property: name, failingCells }) => `${entitySet}.${name}:${failingCells}`);

        it('flags a Measures.Unit field whose values are mostly no unit code or symbol', () => {
            // Given the unit field of a measured field
            const graph = measured('Measures.Unit');
            // When it holds codes that name no unit, Then it fails; when most values are units, Then it passes
            expect(unitsFailing(graph, ['Q01', 'Q02', 'KG', 'Q04'])).toEqual(['Qm.Qu:3']);
            expect(unitsFailing(graph, ['KGM', 'M', 'H', 'PSX'])).toEqual([]);
        });

        it('reads a V2 sap:unit target as a unit field only when its own semantics say so', () => {
            // Given a V2 measured field whose sap:unit target has no unit semantics
            const graph = measured('sap:unit');
            // Then the target, which may hold a currency, is not checked
            expect(unitsFailing(graph, ['EUR', 'USD', 'GBP'])).toEqual([]);
            // Given the target marks itself as a unit of measure, Then it is checked
            const marked = measured('sap:unit');
            const unit = marked.entities[0].properties[2];
            unit.annotations = [...unit.annotations, { term: 'sap:semantics', value: 'unit-of-measure' }];
            expect(unitsFailing(marked, ['EUR', 'USD', 'GBP'])).toEqual(['Qm.Qu:3']);
        });

        it('skips a field that a measured field also names as its currency, and runs only with references', () => {
            // Given a unit field that is also a currency target
            const graph = measured('Measures.Unit');
            graph.entities[0].properties[1].links = { unit: 'Qu', currency: 'Qu' };
            // Then it is not checked
            expect(unitsFailing(graph, ['EUR', 'USD', 'GBP'])).toEqual([]);
            // Given no unit references, Then the check examines nothing
            const assessment = assessRealism({
                graph: measured('Measures.Unit'),
                resources: { Qm: rowsOf(3, (index) => ({ Qu: `Q0${index}` })) }
            });
            expect(assessment.coverage[REALISM_CHECK.unitField]).toEqual({ fields: 0, cells: 0 });
        });
    });

    describe('temporal twins', () => {
        it('flags two distinct time fields that are equal in every row, and passes when they differ once', () => {
            // Given two time fields of no known order that hold one value per row
            const graph = graphOf(
                entity('Qf', [property('Qg', { primitiveType: 'time' }), property('Qh', { primitiveType: 'time' })])
            );
            const twins = { Qf: rowsOf(5, (index) => ({ Qg: `1${index}:00:00`, Qh: `1${index}:00:00` })) };
            // When the rows are checked, Then the pair fails
            expect(failing(graph, twins, REALISM_CHECK.temporalTwin)).toEqual(['Qf.Qg:5']);
            // When one row differs, Then the pair passes
            const apart = { Qf: twins.Qf.map((row, index) => (index === 0 ? { ...row, Qh: '23:00:00' } : row)) };
            expect(failing(graph, apart, REALISM_CHECK.temporalTwin)).toEqual([]);
        });
    });

    describe('reserved hosts', () => {
        it('flags an address outside the reserved domains in any string field and passes reserved ones', () => {
            // Given a field of no role holding e-mail and web addresses
            const graph = graphOf(entity('Qr', [property('Qs'), property('Qu')]));
            const resources = {
                Qr: rowsOf(3, (index) => ({
                    Qs: index === 0 ? 'anna@nordmail.se' : `user${index}@example.com`,
                    Qu: index === 0 ? 'https://www.example.org/a' : 'Plain text'
                }))
            };
            // When the rows are checked, Then only the registrable host fails
            expect(failing(graph, resources, REALISM_CHECK.reservedHost)).toEqual(['Qr.Qs:1']);
        });
    });

    describe('constant columns and supplied rows', () => {
        it('flags a constant column and skips rows the caller supplied', () => {
            // Given a constant generated column, and supplied rows that are constant too
            const graph = graphOf(entity('Bank', [property('Branch')]));
            const resources = { Bank: rowsOf(6, (index) => ({ Branch: index < 5 ? 'Main' : 'North' })) };
            // When all rows are generated, Then the column passes because one row differs
            expect(failing(graph, resources, REALISM_CHECK.constantColumn)).toEqual([]);
            // When the differing row was supplied by the caller, Then the generated rows are constant
            const assessment = assessRealism({ graph, resources, isSupplied: (_set, index) => index === 5 });
            expect(assessment.findings.map(({ check, property: name }) => `${check}:${name}`)).toEqual([
                'constant-column:Branch'
            ]);
        });

        it('does not count a column left empty as constant', () => {
            // Given a mandatory column the generator left empty in every row
            const graph = graphOf(entity('Bank', [property('Branch', { nullable: false })]));
            const resources = { Bank: rowsOf(6, () => ({ Branch: '' })) };
            // When the rows are checked, Then empty is no value, and nothing fails
            expect(failing(graph, resources, REALISM_CHECK.constantColumn)).toEqual([]);
        });
    });
});
