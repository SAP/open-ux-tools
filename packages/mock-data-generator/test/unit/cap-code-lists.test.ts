import { generateService } from '../../src/index.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import { capCodeList, capCodeListField } from '../../src/semantics/cap-code-lists.js';
import { arbitrateSemanticClassifications } from '../../src/semantics/lexical-fallback.js';
import type { SemanticClassification } from '../../src/types.js';

// The shape `cds compile --to edmx` gives @sap/cds/common code lists exposed by a service.
const metadata = `<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0"><edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="CatalogService">
<EntityType Name="Currencies"><Key><PropertyRef Name="code"/></Key>
<Property Name="name" Type="Edm.String" MaxLength="255"/>
<Property Name="descr" Type="Edm.String" MaxLength="1000"/>
<Property Name="code" Type="Edm.String" MaxLength="3" Nullable="false"/>
<Property Name="symbol" Type="Edm.String" MaxLength="5"/>
<Property Name="minorUnit" Type="Edm.Int16"/>
</EntityType>
<EntityType Name="Currencies_texts"><Key><PropertyRef Name="locale"/><PropertyRef Name="code"/></Key>
<Property Name="locale" Type="Edm.String" MaxLength="14" Nullable="false"/>
<Property Name="name" Type="Edm.String" MaxLength="255"/>
<Property Name="descr" Type="Edm.String" MaxLength="1000"/>
<Property Name="code" Type="Edm.String" MaxLength="3" Nullable="false"/>
</EntityType>
<EntityType Name="Countries"><Key><PropertyRef Name="code"/></Key>
<Property Name="name" Type="Edm.String" MaxLength="255"/>
<Property Name="descr" Type="Edm.String" MaxLength="1000"/>
<Property Name="code" Type="Edm.String" MaxLength="3" Nullable="false"/>
</EntityType>
<EntityType Name="Languages"><Key><PropertyRef Name="code"/></Key>
<Property Name="name" Type="Edm.String" MaxLength="255"/>
<Property Name="descr" Type="Edm.String" MaxLength="1000"/>
<Property Name="code" Type="Edm.String" MaxLength="14" Nullable="false"/>
</EntityType>
<EntityType Name="Timezones"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="name" Type="Edm.String" MaxLength="255"/>
</EntityType>
<EntityContainer Name="EntityContainer">
<EntitySet Name="Currencies" EntityType="CatalogService.Currencies"/>
<EntitySet Name="Currencies_texts" EntityType="CatalogService.Currencies_texts"/>
<EntitySet Name="Countries" EntityType="CatalogService.Countries"/>
<EntitySet Name="Languages" EntityType="CatalogService.Languages"/>
<EntitySet Name="Timezones" EntityType="CatalogService.Timezones"/>
</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

const graph = parseEdmx(metadata);
const entity = (name: string) => {
    const found = graph.entities.find((candidate) => candidate.entitySetName === name);
    if (!found) {
        throw new Error(`missing ${name}`);
    }
    return found;
};
const property = (entityName: string, name: string) => {
    const found = entity(entityName).properties.find((candidate) => candidate.name === name);
    if (!found) {
        throw new Error(`missing ${entityName}.${name}`);
    }
    return found;
};

describe('CAP common code lists', () => {
    it('recognizes code lists by name and key shape only', () => {
        expect(capCodeList(entity('Currencies'))).toEqual({ kind: 'currency', texts: false, codeProperty: 'code' });
        expect(capCodeList(entity('Currencies_texts'))).toEqual({
            kind: 'currency',
            texts: true,
            codeProperty: 'code'
        });
        expect(capCodeList(entity('Countries'))).toEqual({ kind: 'country', texts: false, codeProperty: 'code' });
        expect(capCodeList(entity('Languages'))).toEqual({ kind: 'language', texts: false, codeProperty: 'code' });
        // A set named like a code list but keyed differently is application data.
        expect(capCodeList(entity('Timezones'))).toBeUndefined();
    });

    it('maps columns to existing roles and leaves role-less columns to the code-list provider', () => {
        expect(capCodeListField(entity('Currencies'), property('Currencies', 'code'))).toEqual({ role: 'currency' });
        expect(capCodeListField(entity('Currencies'), property('Currencies', 'name'))).toEqual({
            role: 'currency_name'
        });
        expect(capCodeListField(entity('Currencies'), property('Currencies', 'minorUnit'))).toEqual({
            role: 'decimal_places'
        });
        expect(capCodeListField(entity('Currencies'), property('Currencies', 'symbol'))).toEqual({ companion: true });
        expect(capCodeListField(entity('Currencies_texts'), property('Currencies_texts', 'locale'))).toEqual({
            role: 'language'
        });
        expect(capCodeListField(entity('Countries'), property('Countries', 'descr'))).toEqual({ role: 'country_name' });
        expect(capCodeListField(entity('Languages'), property('Languages', 'name'))).toEqual({ companion: true });
    });

    it('decides code-list columns from metadata and never lets the classifier route a companion', () => {
        const learned = new Map<string, SemanticClassification>([
            ['Currencies.symbol', { role: 'currency', confidence: 0.99, source: 'classifier', routeThreshold: 0.5 }],
            ['Languages.name', { role: 'description', confidence: 0.99, source: 'classifier', routeThreshold: 0.5 }]
        ]);
        const decisions = arbitrateSemanticClassifications(graph, learned);
        expect(decisions.get('Currencies.code')).toMatchObject({ role: 'currency', source: 'metadata' });
        expect(decisions.get('Currencies.name')).toMatchObject({ role: 'currency_name', source: 'metadata' });
        expect(decisions.get('Currencies.minorUnit')).toMatchObject({ role: 'decimal_places', source: 'metadata' });
        expect(decisions.get('Currencies.symbol')).toMatchObject({
            role: 'unknown',
            abstentionReason: 'technical-field'
        });
        expect(decisions.get('Languages.name')).toMatchObject({ role: 'unknown', abstentionReason: 'technical-field' });
        expect(decisions.get('Countries.name')).toMatchObject({ role: 'country_name', source: 'metadata' });
    });

    it('fills every code-list row coherently from its own code', async () => {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: metadata },
                service: { urlPath: '/catalog', odataVersion: '4.0' },
                targets: ['Currencies', 'Currencies_texts', 'Countries', 'Languages'].map((name) => ({
                    name,
                    kind: 'entity-set' as const
                })),
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'deterministic', seed: 3, rowsPerEntity: 6 }
        );
        const currencyNames = new Intl.DisplayNames('en', { type: 'currency' });
        for (const row of result.resources.Currencies) {
            const code = String(row.code);
            expect(code).toMatch(/^[A-Z]{3}$/u);
            expect(row.name).toBe(currencyNames.of(code));
            expect(row.descr).toBe(currencyNames.of(code));
            expect(row.minorUnit).toBe(code === 'JPY' ? 0 : 2);
            const symbol = new Intl.NumberFormat('en', {
                style: 'currency',
                currency: code,
                currencyDisplay: 'narrowSymbol'
            })
                .formatToParts(0)
                .find((part) => part.type === 'currency')?.value;
            expect(row.symbol).toBe(symbol);
        }
        for (const row of result.resources.Currencies_texts) {
            const locale = Intl.getCanonicalLocales(String(row.locale).replace(/_/gu, '-'))[0];
            expect(row.name).toBe(new Intl.DisplayNames(locale, { type: 'currency' }).of(String(row.code)));
        }
        const regions = new Intl.DisplayNames('en', { type: 'region' });
        for (const row of result.resources.Countries) {
            expect(row.name).toBe(regions.of(String(row.code)));
        }
        const languages = new Intl.DisplayNames('en', { type: 'language' });
        for (const row of result.resources.Languages) {
            expect(row.name).toBe(languages.of(String(row.code)));
        }
    });
});

// The code lists SAP Gateway adds to every RAP service, as they appear in its OData V2 metadata.
const gatewayMetadata = `<edmx:Edmx xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" Version="1.0"><edmx:DataServices m:DataServiceVersion="2.0"><Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" Namespace="travel">
<EntityType Name="SAP__Currency"><Key><PropertyRef Name="CurrencyCode"/></Key>
<Property Name="CurrencyCode" Type="Edm.String" Nullable="false" MaxLength="5"/>
<Property Name="ISOCode" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="Text" Type="Edm.String" Nullable="false" MaxLength="15"/>
<Property Name="DecimalPlaces" Type="Edm.Byte" Nullable="false"/>
</EntityType>
<EntityType Name="SAP__UnitOfMeasure"><Key><PropertyRef Name="UnitCode"/></Key>
<Property Name="UnitCode" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="ISOCode" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="ExternalCode" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="Text" Type="Edm.String" Nullable="false" MaxLength="30"/>
<Property Name="DecimalPlaces" Type="Edm.Int16"/>
</EntityType>
<EntityType Name="Unit"><Key><PropertyRef Name="Code"/></Key>
<Property Name="Code" Type="Edm.String" Nullable="false" MaxLength="3"/>
<Property Name="ISOCode" Type="Edm.String" MaxLength="3"/>
</EntityType>
<EntityContainer Name="travel_Entities" m:IsDefaultEntityContainer="true">
<EntitySet Name="SAP__Currencies" EntityType="travel.SAP__Currency"/>
<EntitySet Name="SAP__UnitsOfMeasure" EntityType="travel.SAP__UnitOfMeasure"/>
<EntitySet Name="Units" EntityType="travel.Unit"/>
</EntityContainer>
</Schema></edmx:DataServices></edmx:Edmx>`;

describe('SAP Gateway code lists', () => {
    const gatewayGraph = parseEdmx(gatewayMetadata);
    const gatewayEntity = (name: string) => {
        const found = gatewayGraph.entities.find((candidate) => candidate.entitySetName === name);
        if (!found) {
            throw new Error(`missing ${name}`);
        }
        return found;
    };

    it('recognizes only the reserved SAP__ code-list sets with their code key', () => {
        expect(capCodeList(gatewayEntity('SAP__Currencies'))).toEqual({
            kind: 'currency',
            texts: false,
            codeProperty: 'CurrencyCode'
        });
        expect(capCodeList(gatewayEntity('SAP__UnitsOfMeasure'))).toEqual({
            kind: 'unit',
            texts: false,
            codeProperty: 'UnitCode'
        });
        // An application's own unit set with the same columns is classified like any other data.
        expect(capCodeList(gatewayEntity('Units'))).toBeUndefined();
    });

    it('fills every Gateway code-list row coherently from its own code', async () => {
        const result = await generateService(
            {
                metadata: { format: 'edmx', content: gatewayMetadata },
                service: { urlPath: '/travel', odataVersion: '2.0' },
                targets: ['SAP__Currencies', 'SAP__UnitsOfMeasure'].map((name) => ({
                    name,
                    kind: 'entity-set' as const
                })),
                existingData: {}
            },
            { pipeline: 'semantic-v2', mode: 'deterministic', seed: 5, rowsPerEntity: 6 }
        );
        const currencyNames = new Intl.DisplayNames('en', { type: 'currency' });
        expect(result.resources.SAP__Currencies).toHaveLength(6);
        for (const row of result.resources.SAP__Currencies) {
            const code = String(row.CurrencyCode);
            expect(code).toMatch(/^[A-Z]{3}$/u);
            expect(row.ISOCode).toBe(code);
            expect(row.DecimalPlaces).toBe(code === 'JPY' ? 0 : 2);
            // The 15-character text column holds the leading characters of longer names.
            expect(row.Text).toBe(
                Array.from(currencyNames.of(code) ?? '')
                    .slice(0, 15)
                    .join('')
            );
        }
        const units = new Map([
            ['KG', { iso: 'KGM', text: 'Kilogram', decimals: 3 }],
            ['EA', { iso: 'EA', text: 'Each', decimals: 0 }],
            ['PC', { iso: 'PCE', text: 'Piece', decimals: 0 }]
        ]);
        expect(result.resources.SAP__UnitsOfMeasure).toHaveLength(6);
        for (const row of result.resources.SAP__UnitsOfMeasure) {
            const code = String(row.UnitCode);
            expect(row.ExternalCode).toBe(code);
            expect(typeof row.ISOCode).toBe('string');
            expect(typeof row.Text).toBe('string');
            expect(Number.isInteger(row.DecimalPlaces)).toBe(true);
            const known = units.get(code);
            if (known) {
                expect(row).toMatchObject({ ISOCode: known.iso, Text: known.text, DecimalPlaces: known.decimals });
            }
        }
        expect(result.tiers?.typed).toBe(0);
    });
});
