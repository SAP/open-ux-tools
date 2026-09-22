import { generateService, inspectService, validateGeneratedResult } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { semanticRowContext, semanticValue } from '../../src/semantics/value-banks.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyCurrencyMetadata, assertCurrencyMetadata } from '../../src/generation/currency-metadata.js';
import { propertyValueIsValid } from '../../src/generation/constraints.js';
import { travelAuthoredValueHelpEvidence } from './travel-authored-value-helps.js';

const metadata = `<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" Version="1.0"><edmx:DataServices><Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" xmlns:sap="http://www.sap.com/Protocols/SAPData" Namespace="Test">
<EntityType Name="JourneyType"><Key><PropertyRef Name="ID"/></Key><Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="BeginDate" Type="Edm.DateTime" sap:display-format="Date"/><Property Name="EndDate" Type="Edm.DateTime" sap:display-format="Date"/>
<Property Name="BookingFee" Type="Edm.Decimal" Precision="16" Scale="3" sap:unit="CurrencyCode"/><Property Name="CurrencyCode" Type="Edm.String" MaxLength="3" sap:semantics="currency-code"/>
</EntityType><EntityType Name="MoneyType"><Key><PropertyRef Name="Code"/></Key><Property Name="Code" Type="Edm.String" Nullable="false" MaxLength="3"/><Property Name="ISO" Type="Edm.String" MaxLength="3"/><Property Name="Label" Type="Edm.String" MaxLength="60"/><Property Name="Digits" Type="Edm.Byte" Nullable="false"/></EntityType>
<EntityContainer Name="Container"><EntitySet Name="Journeys" EntityType="Test.JourneyType"/><EntitySet Name="Money" EntityType="Test.MoneyType"/></EntityContainer>
<Annotations Target="Test.Container"><Annotation Term="com.sap.vocabularies.CodeList.v1.CurrencyCodes"><Record><PropertyValue Property="Url" String="./$metadata"/><PropertyValue Property="CollectionPath" String="Money"/></Record></Annotation></Annotations>
<Annotations Target="Test.MoneyType/Code"><Annotation Term="com.sap.vocabularies.Common.v1.Text" Path="Label"/><Annotation Term="com.sap.vocabularies.Common.v1.UnitSpecificScale" Path="Digits"/><Annotation Term="com.sap.vocabularies.CodeList.v1.StandardCode" Path="ISO"/></Annotations>
</Schema></edmx:DataServices></edmx:Edmx>`;

const request = {
    metadata: { format: 'edmx', content: metadata },
    service: { urlPath: '/journeys', odataVersion: '2.0' },
    targets: [
        { name: 'Journeys', kind: 'entity-set' },
        { name: 'Money', kind: 'entity-set' }
    ],
    existingData: {}
} as const;
const options = { pipeline: 'semantic-v2', seed: 42, rowsPerEntity: 10 } as const;

describe('Travel screenshot format regressions', () => {
    it('retains NonNegative string formatting as executable identifier evidence', async () => {
        const content = metadata.replace(
            '<Property Name="ID" Type="Edm.Int32" Nullable="false"/>',
            '<Property Name="ID" Type="Edm.String" MaxLength="8" Nullable="false" sap:display-format="NonNegative"/>'
        );
        const report = await inspectService(
            { ...request, metadata: { format: 'edmx', content } },
            options,
            {},
            { includeGeneratedValues: true }
        );
        expect(
            report.fieldDecisions.find((field) => field.resource === 'Journeys' && field.property === 'ID')
                ?.acceptedRole
        ).toBe('numeric_identifier');
        for (const row of report.generatedValues?.Journeys ?? []) {
            expect(row.ID).toMatch(/^\d+$/);
        }
    });
    it('derives country value-help text through the public generation pipeline', async () => {
        const content = readFileSync(join(process.cwd(), 'test/unit/travel-v2.metadata.xml'), 'utf8');
        const result = await generateService(
            {
                ...request,
                metadata: { format: 'edmx', content },
                targets: [{ name: 'Country', kind: 'entity-set' }]
            },
            options
        );
        const names = new Intl.DisplayNames('en', { type: 'region' });
        expect(result.resources.Country.length).toBeGreaterThan(1);
        for (const row of result.resources.Country) {
            expect(row.Country_Text).toBe(names.of(String(row.Country)));
        }
    });
    it('keeps annotated monetary precision compatible after all generated value-help assignments', async () => {
        const content = readFileSync(join(process.cwd(), 'test/unit/travel-v2.metadata.xml'), 'utf8');
        const graph = parseEdmx(content);
        const result = await generateService(
            {
                ...request,
                metadata: { format: 'edmx', content },
                existingData: travelAuthoredValueHelpEvidence,
                targets: graph.entities.map(({ entitySetName }) => ({
                    name: entitySetName,
                    kind: 'entity-set' as const
                }))
            },
            options
        );
        for (const entity of graph.entities) {
            for (const property of entity.properties.filter(({ links }) => links?.currency)) {
                for (const row of result.resources[entity.entitySetName] ?? []) {
                    const currency = String(row[property.links?.currency ?? '']);
                    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
                        .maximumFractionDigits;
                    expect(Number(row[property.name])).toBe(Number(Number(row[property.name]).toFixed(digits)));
                }
            }
        }
    });
    it.each(['U$', 'ZZZ'])('preserves the standard-code mapping for ordinary local code %s without enums', (Code) => {
        const graph = parseEdmx(metadata);
        const rows = { Money: [{ Code, ISO: 'USD', Digits: 2, Label: 'US Dollar' }] };
        expect(() => assertCurrencyMetadata(graph, rows)).not.toThrow();
        expect(applyCurrencyMetadata(graph, rows, []).Money).toEqual(rows.Money);
    });
    it('derives currency text from the actual generated code, including ordinary value helps', async () => {
        const result = await generateService(
            {
                ...request,
                metadata: {
                    format: 'edmx',
                    content: readFileSync(join(process.cwd(), 'test/unit/travel-v2.metadata.xml'), 'utf8')
                },
                targets: [{ name: 'Currency', kind: 'entity-set' }]
            },
            options
        );
        for (const row of result.resources.Currency) {
            expect(row.Currency_Text).toBe(new Intl.DisplayNames('en', { type: 'currency' }).of(String(row.Currency)));
        }
    });
    it('supports the date-role primitive types advertised by the registry', () => {
        const context = semanticRowContext(42);
        for (const primitiveType of ['date', 'datetime', 'datetimeoffset'] as const) {
            const field = { name: 'EndDate', primitiveType, nullable: false, isKey: false, annotations: [] };
            const value = semanticValue('end_date', field, context, 42, 0);
            expect(typeof value).toBe('string');
            expect(String(value).startsWith('2023-')).toBe(true);
        }
    });

    it('provides generic values for retained classifier date, time and identifier roles', () => {
        const context = semanticRowContext(42);
        for (const [role, primitiveType] of [
            ['date', 'date'],
            ['datetime', 'datetime'],
            ['time', 'time'],
            ['business_partner_id', 'string']
        ] as const) {
            const field = { name: 'Value', primitiveType, nullable: false, isKey: false, annotations: [] };
            const value = semanticValue(role, field, context, 42, 0);
            expect(typeof value).toBe('string');
            expect(propertyValueIsValid(field, value)).toBe(true);
        }
    });

    it.each(['customer_id', 'vendor_id', 'material_no', 'purchase_order_no', 'sales_doc_no'] as const)(
        'provides a facet-valid synthetic identifier for %s without a business catalog',
        (role) => {
            const field = {
                name: 'Reference',
                primitiveType: 'string' as const,
                nullable: false,
                isKey: false,
                maxLength: 10,
                annotations: []
            };
            const value = semanticValue(role, field, semanticRowContext(42), 42, 0);
            expect(typeof value).toBe('string');
            expect(propertyValueIsValid(field, value)).toBe(true);
            expect(value).not.toMatch(/[A-Z]{2,}/u);
        }
    );

    it('supplies a currency-name provider rather than a generic description', () => {
        const context = semanticRowContext(42);
        const field = {
            name: 'CurrencyName',
            primitiveType: 'string' as const,
            nullable: false,
            isKey: false,
            annotations: []
        };
        expect(semanticValue('currency_name', field, context, 42, 0)).toBe(
            new Intl.DisplayNames('en', { type: 'currency' }).of(context.currency)
        );
    });
    it('normalizes V2 date-only and explicit currency evidence', () => {
        const graph = parseEdmx(metadata);
        const journey = graph.entities[0];
        expect(journey.properties.find(({ name }) => name === 'BeginDate')?.primitiveType).toBe('date');
        expect(journey.properties.find(({ name }) => name === 'BookingFee')?.links?.currency).toBe('CurrencyCode');
        expect(graph.entities[1]).toMatchObject({ codeList: 'currency' });
        expect(graph.entities[1].properties[0].links).toMatchObject({
            scale: 'Digits',
            standardCode: 'ISO',
            text: 'Label'
        });
    });

    it('generates ordered date-only samples and reports the sampling assumption', async () => {
        const report = await inspectService(request, options, {}, { includeGeneratedValues: true });
        for (const row of report.generatedValues?.Journeys ?? []) {
            expect(row.BeginDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(String(row.EndDate) >= String(row.BeginDate)).toBe(true);
        }
        expect(report.diagnostics.some(({ code }) => code === 'SYNTHETIC_TEMPORAL_ORDERING')).toBe(true);
    });

    it('rejects reversed synthetic date ranges when validating a cached result', async () => {
        const result = await generateService(request, options);
        const invalid = {
            ...result,
            resources: {
                ...result.resources,
                Journeys: result.resources.Journeys.map((row) => ({
                    ...row,
                    BeginDate: '2026-06-01',
                    EndDate: '2026-05-01'
                }))
            }
        };
        expect(() => validateGeneratedResult(request, invalid, options)).toThrow(/temporal|date/i);
        expect(() =>
            validateGeneratedResult(request, invalid, {
                ...options,
                syntheticScenario: { id: 'independent-dates', version: '1', domains: {}, coherence: { Journeys: [] } }
            })
        ).not.toThrow();
    });

    it('generates bounded monetary samples with currency-compatible fractions', async () => {
        const result = await generateService(request, options);
        for (const row of result.resources.Journeys) {
            const digits =
                new Intl.NumberFormat('en', { style: 'currency', currency: String(row.CurrencyCode) }).resolvedOptions()
                    .maximumFractionDigits ?? 2;
            expect(Number(row.BookingFee)).toBeLessThan(10_000);
            expect(Number(row.BookingFee)).toBe(Number(Number(row.BookingFee).toFixed(digits)));
        }
    });

    it('generates currency display metadata from renamed annotated fields', async () => {
        const result = await generateService(request, options);
        expect(result.resources.Money.length).toBeGreaterThan(0);
        for (const row of result.resources.Money) {
            expect(row.Code).toMatch(/^[A-Z]{3}$/);
            const digits = new Intl.NumberFormat('en', {
                style: 'currency',
                currency: String(row.Code)
            }).resolvedOptions().maximumFractionDigits;
            expect(row.Digits).toBe(digits);
            expect(row.ISO).toBe(row.Code);
            expect(row.Label).toBe(new Intl.DisplayNames('en', { type: 'currency' }).of(String(row.Code)));
        }
        expect(() =>
            validateGeneratedResult(
                request,
                {
                    ...result,
                    resources: {
                        ...result.resources,
                        Money: result.resources.Money.map((row) => ({ ...row, Digits: 151 }))
                    }
                },
                options
            )
        ).toThrow(/currency|format/i);
    });

    it('preserves a declared local currency code mapped to an independent standard code', async () => {
        const result = await generateService(request, {
            ...options,
            syntheticScenario: {
                id: 'declared-local-currency',
                version: '1',
                domains: {
                    'Money.Code': ['U$'],
                    'Money.ISO': ['USD'],
                    'Money.Digits': [2],
                    'Money.Label': ['Authored dollar label']
                }
            }
        });
        expect(result.resources.Money).toEqual([{ Code: 'U$', ISO: 'USD', Digits: 2, Label: 'Authored dollar label' }]);
    });
});
