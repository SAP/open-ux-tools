import { parseEdmx } from '../../src/schema/edmx.js';
import {
    completeReferencedCodeLists,
    describeReferencedServices,
    referencedServiceFolder
} from '../../src/generation/referenced-code-lists.js';
import { currencyFractionDigits } from '../../src/generation/coherence.js';
import { createGenerationFingerprint } from '../../src/index.js';
import { generateService } from '../../src/public.js';
import type {
    MockDataGeneratorDiagnostic,
    MockDataMetadata,
    MockDataReferencedService,
    MockDataRow,
    MockDataServiceRequest
} from '../../src/types.js';

/** Service path of the requested test services, four segments below the shared root `/srv/root`. */
const SERVICE_PATH = '/srv/root/a/b/c/0001/';
/** Code-list service reached from `SERVICE_PATH`, as SAP Gateway services reach their common code lists. */
const CODE_LIST_URL = '../../../../common/lists/0001/$metadata';
const CODE_LIST_FOLDER = 'common/lists/0001';

/** Names of one requested test service: a measured entity and the code list its measure points to. */
interface MeasuredService {
    namespace: string;
    entityType: string;
    entitySet: string;
    key: string;
    measure: string;
    code: string;
    kind: 'currency' | 'unit';
    collection: string;
}

/** Names of one referenced code-list entity and the fields its key annotations name. */
interface CodeListService {
    entityType: string;
    entitySet: string;
    key: string;
    keyMaxLength: number;
    text: string;
    textMaxLength: number;
    scale: string;
    standardCode: string;
    externalCode?: string;
    extraRequired?: string;
}

/**
 * EDMX of a requested V4 service with one measured field whose code list lives in another service.
 *
 * @param service names of the service
 * @returns the EDMX document
 */
function measuredServiceEdmx(service: MeasuredService): string {
    const measureTerm =
        service.kind === 'currency' ? 'Org.OData.Measures.V1.ISOCurrency' : 'Org.OData.Measures.V1.Unit';
    const codeListTerm =
        service.kind === 'currency'
            ? 'com.sap.vocabularies.CodeList.v1.CurrencyCodes'
            : 'com.sap.vocabularies.CodeList.v1.UnitsOfMeasure';
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="${service.namespace}" Alias="SAP__self" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="${service.entityType}">
        <Key><PropertyRef Name="${service.key}"/></Key>
        <Property Name="${service.key}" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="${service.measure}" Type="Edm.Decimal" Precision="16" Scale="3"/>
        <Property Name="${service.code}" Type="Edm.String" MaxLength="5"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="${service.entitySet}" EntityType="${service.namespace}.${service.entityType}"/>
      </EntityContainer>
      <Annotations Target="SAP__self.${service.entityType}/${service.measure}">
        <Annotation Term="${measureTerm}" Path="${service.code}"/>
      </Annotations>
      <Annotations Target="SAP__self.Container">
        <Annotation Term="${codeListTerm}">
          <Record>
            <PropertyValue Property="Url" String="${CODE_LIST_URL}"/>
            <PropertyValue Property="CollectionPath" String="${service.collection}"/>
          </Record>
        </Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * EDMX of a referenced V4 code-list service.
 *
 * @param list names of the code-list entity
 * @returns the EDMX document
 */
function codeListServiceEdmx(list: CodeListService): string {
    const external = list.externalCode
        ? `<Property Name="${list.externalCode}" Type="Edm.String" Nullable="false" MaxLength="${list.keyMaxLength}"/>`
        : '';
    const externalAnnotation = list.externalCode
        ? `<Annotation Term="com.sap.vocabularies.CodeList.v1.ExternalCode" Path="${list.externalCode}"/>`
        : '';
    const extra = list.extraRequired
        ? `<Property Name="${list.extraRequired}" Type="Edm.Boolean" Nullable="false"/>`
        : '';
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="lists.v0001" Alias="SAP__self" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="${list.entityType}">
        <Key><PropertyRef Name="${list.key}"/></Key>
        <Property Name="${list.key}" Type="Edm.String" Nullable="false" MaxLength="${list.keyMaxLength}"/>
        <Property Name="${list.standardCode}" Type="Edm.String" Nullable="false" MaxLength="3"/>
        ${external}
        <Property Name="${list.text}" Type="Edm.String" Nullable="false" MaxLength="${list.textMaxLength}"/>
        <Property Name="${list.scale}" Type="Edm.Int16"/>
        ${extra}
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="${list.entitySet}" EntityType="lists.v0001.${list.entityType}"/>
      </EntityContainer>
      <Annotations Target="SAP__self.${list.entityType}/${list.key}">
        <Annotation Term="com.sap.vocabularies.Common.v1.Text" Path="${list.text}"/>
        <Annotation Term="com.sap.vocabularies.Common.v1.UnitSpecificScale" Path="${list.scale}"/>
        <Annotation Term="com.sap.vocabularies.CodeList.v1.StandardCode" Path="${list.standardCode}"/>
        ${externalAnnotation}
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}

/**
 * A request for a measured service, with its referenced code-list service when given.
 *
 * @param service names of the requested service
 * @param list names of the code-list entity; no referenced service is passed when absent
 * @param existingRows rows already in the code list's data file
 * @returns the request
 */
function request(
    service: MeasuredService,
    list?: CodeListService,
    existingRows?: ReadonlyArray<MockDataRow>
): MockDataServiceRequest {
    const referencedServices: MockDataReferencedService[] = list
        ? [
              {
                  folder: CODE_LIST_FOLDER,
                  metadata: { format: 'edmx', content: codeListServiceEdmx(list) },
                  ...(existingRows ? { existingRows: { [list.entitySet]: existingRows } } : {})
              }
          ]
        : [];
    return {
        metadata: { format: 'edmx', content: measuredServiceEdmx(service) },
        service: { urlPath: SERVICE_PATH, odataVersion: '4.0' },
        targets: [{ name: service.entitySet, kind: 'entity-set' }],
        existingData: {},
        referencedServices
    };
}

/**
 * Completes the referenced code lists for rows of the requested service.
 *
 * @param serviceRequest the request
 * @param rows rows of the requested service by entity set
 * @returns the referenced resources and the diagnostics
 */
function complete(
    serviceRequest: MockDataServiceRequest,
    rows: Readonly<Record<string, ReadonlyArray<MockDataRow>>>
): { resources: ReturnType<typeof completeReferencedCodeLists>; diagnostics: MockDataGeneratorDiagnostic[] } {
    const diagnostics: MockDataGeneratorDiagnostic[] = [];
    const graph = parseEdmx(serviceRequest.metadata.content);
    return { resources: completeReferencedCodeLists(serviceRequest, graph, rows, diagnostics), diagnostics };
}

const travel: MeasuredService = {
    namespace: 'travel',
    entityType: 'Trip',
    entitySet: 'Trips',
    key: 'TripID',
    measure: 'TotalPrice',
    code: 'CurrencyCode',
    kind: 'currency',
    collection: 'Currencies'
};
const currencies: CodeListService = {
    entityType: 'Currency',
    entitySet: 'Currencies',
    key: 'CurrencyCode',
    keyMaxLength: 5,
    text: 'Text',
    textMaxLength: 15,
    scale: 'DecimalPlaces',
    standardCode: 'ISOCode'
};
const warehouse: MeasuredService = {
    namespace: 'warehouse',
    entityType: 'StockItem',
    entitySet: 'StockItems',
    key: 'ItemID',
    measure: 'Quantity',
    code: 'QuantityUnit',
    kind: 'unit',
    collection: 'UnitsOfMeasure'
};
const units: CodeListService = {
    entityType: 'UnitOfMeasure',
    entitySet: 'UnitsOfMeasure',
    key: 'UnitCode',
    keyMaxLength: 3,
    text: 'Text',
    textMaxLength: 30,
    scale: 'DecimalPlaces',
    standardCode: 'ISOCode',
    externalCode: 'ExternalCode'
};
const finance: MeasuredService = {
    namespace: 'finance',
    entityType: 'JournalLine',
    entitySet: 'JournalLines',
    key: 'LineID',
    measure: 'AmountInCompanyCodeCurrency',
    code: 'CompanyCodeCurrency',
    kind: 'currency',
    collection: 'Currencies'
};
/** Names that carry no meaning, so only the annotations can tie the fields together. */
const meaningless: MeasuredService = {
    namespace: 'q',
    entityType: 'Zq1',
    entitySet: 'Zz9',
    key: 'K0',
    measure: 'A1',
    code: 'B2',
    kind: 'currency',
    collection: 'Qq'
};
const meaninglessList: CodeListService = {
    entityType: 'Xy',
    entitySet: 'Qq',
    key: 'P7',
    keyMaxLength: 5,
    text: 'R3',
    textMaxLength: 40,
    scale: 'S4',
    standardCode: 'T5',
    extraRequired: 'U6'
};

describe('referencedServiceFolder', () => {
    it('resolves the folder below the path the services share, as the mockserver serves it', () => {
        expect(referencedServiceFolder(SERVICE_PATH, CODE_LIST_URL)).toBe(CODE_LIST_FOLDER);
        expect(
            referencedServiceFolder(
                '/sap/opu/odata4/dmo/ui_travel_d_d_o4/srvd/dmo/ui_travel_d_d/0001/',
                '../../../../default/iwbep/common/0001/$metadata'
            )
        ).toBe('default/iwbep/common/0001');
    });

    it('drops matrix parameters as the mockserver does', () => {
        expect(referencedServiceFolder(SERVICE_PATH, "../../../../common;ps='x'/$metadata")).toBe('common');
    });

    it('returns undefined when the url leaves no folder', () => {
        expect(referencedServiceFolder(SERVICE_PATH, './$metadata')).toBeUndefined();
    });

    it('returns undefined for a segment that is not a plain name', () => {
        expect(referencedServiceFolder(SERVICE_PATH, String.raw`../../../../common\..\x/$metadata`)).toBeUndefined();
    });
});

describe('describeReferencedServices', () => {
    it('names each folder once with the code-list entity sets it holds', () => {
        expect(describeReferencedServices(request(travel))).toEqual([
            { folder: CODE_LIST_FOLDER, entitySets: ['Currencies'] }
        ]);
    });

    it('describes no code list whose entity set is not an OData identifier', () => {
        expect(describeReferencedServices(request({ ...travel, collection: '../Currencies' }))).toEqual([]);
    });

    it('describes nothing for CSN metadata', () => {
        const metadata: MockDataMetadata = { format: 'csn', content: '{}' };
        expect(describeReferencedServices({ metadata, service: request(travel).service })).toEqual([]);
    });
});

describe('completeReferencedCodeLists', () => {
    it('adds every ISO currency the rows use with its name and minor units (travel)', () => {
        const rows = {
            Trips: [
                { TripID: '1', TotalPrice: 10.5, CurrencyCode: 'JPY' },
                { TripID: '2', TotalPrice: 3, CurrencyCode: 'EUR' },
                { TripID: '3', TotalPrice: 4, CurrencyCode: 'EUR' }
            ]
        };

        const { resources, diagnostics } = complete(request(travel, currencies), rows);

        expect(diagnostics).toEqual([]);
        expect(resources).toEqual([
            {
                folder: CODE_LIST_FOLDER,
                entitySet: 'Currencies',
                rows: [
                    { CurrencyCode: 'EUR', ISOCode: 'EUR', Text: 'Euro', DecimalPlaces: 2 },
                    { CurrencyCode: 'JPY', ISOCode: 'JPY', Text: 'Japanese Yen', DecimalPlaces: 0 }
                ]
            }
        ]);
    });

    it('adds every unit the rows use with its external code and the digits its quantities use (warehouse)', () => {
        const rows = {
            StockItems: [
                { ItemID: '1', Quantity: '2.125', QuantityUnit: 'KG' },
                { ItemID: '2', Quantity: 7, QuantityUnit: 'PC' }
            ]
        };

        const { resources, diagnostics } = complete(request(warehouse, units), rows);

        expect(diagnostics).toEqual([]);
        expect(resources[0]?.rows).toEqual([
            { UnitCode: 'KG', ISOCode: 'KG', ExternalCode: 'KG', Text: 'KG', DecimalPlaces: 3 },
            { UnitCode: 'PC', ISOCode: 'PC', ExternalCode: 'PC', Text: 'PC', DecimalPlaces: 0 }
        ]);
    });

    it('keeps existing rows as written and adds only the missing codes after them (finance)', () => {
        const existing = [{ CurrencyCode: 'USD', ISOCode: 'USD', Text: 'Dollar (house)', DecimalPlaces: 2 }];
        const rows = {
            JournalLines: [
                { LineID: '1', AmountInCompanyCodeCurrency: 1, CompanyCodeCurrency: 'USD' },
                { LineID: '2', AmountInCompanyCodeCurrency: 1, CompanyCodeCurrency: 'CHF' }
            ]
        };

        const { resources } = complete(request(finance, currencies, existing), rows);

        expect(resources[0]?.rows).toEqual([
            existing[0],
            { CurrencyCode: 'CHF', ISOCode: 'CHF', Text: 'Swiss Franc', DecimalPlaces: 2 }
        ]);
    });

    it('writes no resource when the code list already holds every used code', () => {
        const existing = [{ CurrencyCode: 'USD', ISOCode: 'USD', Text: 'US Dollar', DecimalPlaces: 2 }];
        const rows = { JournalLines: [{ LineID: '1', AmountInCompanyCodeCurrency: 1, CompanyCodeCurrency: 'USD' }] };

        expect(complete(request(finance, currencies, existing), rows).resources).toEqual([]);
    });

    it('follows only the annotations when no name carries meaning', () => {
        const rows = { Zz9: [{ K0: '1', A1: '1.50', B2: 'Cur1' }] };

        const { resources, diagnostics } = complete(request(meaningless, meaninglessList), rows);

        expect(diagnostics).toEqual([]);
        // A code no standard defines keeps itself as its name and at least two fraction digits; the standard code
        // is cut to its field, the key never is.
        expect(resources).toEqual([
            {
                folder: CODE_LIST_FOLDER,
                entitySet: 'Qq',
                rows: [{ P7: 'Cur1', T5: 'Cur', R3: 'Cur1', S4: 2, U6: false }]
            }
        ]);
    });

    it('cuts a currency name to its field in code points', () => {
        const rows = { Trips: [{ TripID: '1', TotalPrice: 1, CurrencyCode: 'AUD' }] };

        const { resources } = complete(request(travel, currencies), rows);

        expect(resources[0]?.rows[0]?.Text).toBe('Australian Doll');
    });

    it('reports a code that does not fit the code-list key instead of cutting it', () => {
        const rows = { Trips: [{ TripID: '1', TotalPrice: 1, CurrencyCode: 'LONGER' }] };

        const { resources, diagnostics } = complete(request(travel, currencies), rows);

        expect(resources).toEqual([]);
        expect(diagnostics.map(({ code }) => code)).toEqual(['REFERENCED_CODE_LIST_UNSUPPORTED']);
    });

    it('ignores blank and non-string codes', () => {
        const rows = {
            Trips: [
                { TripID: '1', TotalPrice: 1, CurrencyCode: ' ' },
                { TripID: '2', TotalPrice: 1, CurrencyCode: 7 },
                { TripID: '3', TotalPrice: 1, CurrencyCode: null }
            ]
        };

        const { resources, diagnostics } = complete(request(travel, currencies), rows);

        expect(resources).toEqual([]);
        expect(diagnostics).toEqual([]);
    });

    it('reports a declared code list whose service the host did not pass', () => {
        const rows = { Trips: [{ TripID: '1', TotalPrice: 1, CurrencyCode: 'EUR' }] };

        const { resources, diagnostics } = complete(request(travel), rows);

        expect(resources).toEqual([]);
        expect(diagnostics).toEqual([
            expect.objectContaining({
                code: 'REFERENCED_SERVICE_UNAVAILABLE',
                severity: 'warning',
                target: `${CODE_LIST_FOLDER}/Currencies`
            })
        ]);
    });

    it('reports nothing when the rows use no code', () => {
        expect(complete(request(travel), { Trips: [] })).toEqual({ resources: [], diagnostics: [] });
    });

    it('reports a referenced service whose metadata is unreadable or lacks the code list', () => {
        const rows = { Trips: [{ TripID: '1', TotalPrice: 1, CurrencyCode: 'EUR' }] };
        const broken = (metadata: MockDataMetadata): MockDataServiceRequest => ({
            ...request(travel),
            referencedServices: [{ folder: CODE_LIST_FOLDER, metadata }]
        });

        for (const metadata of [
            { format: 'edmx', content: '<not-edmx/>' },
            { format: 'csn', content: '{}' },
            { format: 'edmx', content: codeListServiceEdmx({ ...currencies, entitySet: 'Other' }) }
        ] as const) {
            const { resources, diagnostics } = complete(broken(metadata), rows);
            expect(resources).toEqual([]);
            expect(diagnostics.map(({ code }) => code)).toEqual(['REFERENCED_CODE_LIST_UNSUPPORTED']);
        }
    });
});

describe('generateService with referenced services', () => {
    it('returns the completed code lists beside the generated rows', async () => {
        const result = await generateService(request(travel, currencies), {
            mode: 'deterministic',
            seed: 1,
            rowsPerEntity: 5
        });

        const used = new Set(result.resources.Trips?.map((row) => row.CurrencyCode));
        const listed = new Set(result.referencedResources?.[0]?.rows.map((row) => row.CurrencyCode));
        expect(used.size).toBeGreaterThan(0);
        expect(listed).toEqual(used);
        expect(result.diagnostics.filter(({ code }) => code.startsWith('REFERENCED_'))).toEqual([]);
    });
});

/** A V2 service whose amount names its currency with `sap:unit`, and whose code list lives in another service. */
const v2Service = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:sap="http://www.sap.com/Protocols/SAPData">
  <edmx:DataServices xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" m:DataServiceVersion="2.0">
    <Schema Namespace="orders" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
      <EntityType Name="Order">
        <Key><PropertyRef Name="OrderID"/></Key>
        <Property Name="OrderID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="NetAmount" Type="Edm.Decimal" Precision="16" Scale="3" sap:unit="DocumentCurrency"/>
        <Property Name="DocumentCurrency" Type="Edm.String" MaxLength="5" sap:semantics="currency-code"/>
        <Property Name="Weight" Type="Edm.Decimal" Precision="13" Scale="3" sap:unit="WeightUnit"/>
        <Property Name="WeightUnit" Type="Edm.String" MaxLength="3" sap:semantics="unit-of-measure"/>
      </EntityType>
      <EntityContainer Name="orders_Entities" m:IsDefaultEntityContainer="true">
        <EntitySet Name="Orders" EntityType="orders.Order"/>
      </EntityContainer>
      <Annotations Target="orders.orders_Entities" xmlns="http://docs.oasis-open.org/odata/ns/edm">
        <Annotation Term="com.sap.vocabularies.CodeList.v1.CurrencyCodes">
          <Record>
            <PropertyValue Property="Url" String="${CODE_LIST_URL}"/>
            <PropertyValue Property="CollectionPath" String="Currencies"/>
          </Record>
        </Annotation>
        <Annotation Term="com.sap.vocabularies.CodeList.v1.UnitsOfMeasure">
          <Record>
            <PropertyValue Property="Url" String="${CODE_LIST_URL}"/>
            <PropertyValue Property="CollectionPath" String="UnitsOfMeasure"/>
          </Record>
        </Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

describe('OData V2 measures', () => {
    it('files a sap:unit that names a currency code under currencies, and a unit under units', () => {
        const serviceRequest: MockDataServiceRequest = {
            metadata: { format: 'edmx', content: v2Service },
            service: { urlPath: SERVICE_PATH, odataVersion: '2.0' },
            targets: [],
            existingData: {},
            referencedServices: [
                {
                    folder: CODE_LIST_FOLDER,
                    metadata: {
                        format: 'edmx',
                        content: codeListServiceEdmx(currencies).replace(
                            '</EntityContainer>',
                            '<EntitySet Name="UnitsOfMeasure" EntityType="lists.v0001.Unit"/></EntityContainer>'
                        )
                    }
                }
            ]
        };
        const rows = { Orders: [{ OrderID: '1', NetAmount: 1, DocumentCurrency: 'EUR', Weight: 1, WeightUnit: 'KG' }] };

        const { resources, diagnostics } = complete(serviceRequest, rows);

        expect(
            resources.map(({ entitySet, rows: listed }) => [entitySet, listed.map((row) => row.CurrencyCode)])
        ).toEqual([['Currencies', ['EUR']]]);
        // The unit list's entity type is not in the referenced document, so it is reported, not skipped silently.
        expect(diagnostics).toEqual([
            expect.objectContaining({
                code: 'REFERENCED_CODE_LIST_UNSUPPORTED',
                target: `${CODE_LIST_FOLDER}/UnitsOfMeasure`
            })
        ]);
    });
});

describe('request fingerprint', () => {
    it('changes with the referenced services and keeps its value for a request without them', () => {
        const without = request(travel);
        const { referencedServices: _omitted, ...plain } = without;

        expect(createGenerationFingerprint(without)).not.toBe(createGenerationFingerprint(request(travel, currencies)));
        expect(createGenerationFingerprint({ ...without, referencedServices: undefined })).toBe(
            createGenerationFingerprint(plain)
        );
    });
});

/** A V4 service whose currency code list is its own, declared on the container through the schema alias. */
const aliasedOwnCodeList = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="com.example.sales.v0001" Alias="SAP__self" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Invoice">
        <Key><PropertyRef Name="InvoiceID"/></Key>
        <Property Name="InvoiceID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="GrossAmount" Type="Edm.Decimal" Precision="16" Scale="3"/>
        <Property Name="TransactionCurrency" Type="Edm.String" MaxLength="5"/>
      </EntityType>
      <EntityType Name="Currency">
        <Key><PropertyRef Name="CurrencyCode"/></Key>
        <Property Name="CurrencyCode" Type="Edm.String" Nullable="false" MaxLength="5"/>
        <Property Name="ISOCode" Type="Edm.String" Nullable="false" MaxLength="3"/>
        <Property Name="Text" Type="Edm.String" Nullable="false" MaxLength="40"/>
        <Property Name="DecimalPlaces" Type="Edm.Byte" Nullable="false"/>
      </EntityType>
      <EntityContainer Name="Container">
        <EntitySet Name="Invoices" EntityType="com.example.sales.v0001.Invoice"/>
        <EntitySet Name="Currencies" EntityType="com.example.sales.v0001.Currency"/>
      </EntityContainer>
      <Annotations Target="SAP__self.Invoice/GrossAmount">
        <Annotation Term="Org.OData.Measures.V1.ISOCurrency" Path="TransactionCurrency"/>
      </Annotations>
      <Annotations Target="SAP__self.Currency/CurrencyCode">
        <Annotation Term="com.sap.vocabularies.Common.v1.Text" Path="Text"/>
        <Annotation Term="com.sap.vocabularies.Common.v1.UnitSpecificScale" Path="DecimalPlaces"/>
        <Annotation Term="com.sap.vocabularies.CodeList.v1.StandardCode" Path="ISOCode"/>
      </Annotations>
      <Annotations Target="SAP__self.Container">
        <Annotation Term="com.sap.vocabularies.CodeList.v1.CurrencyCodes">
          <Record>
            <PropertyValue Property="Url" String="./$metadata"/>
            <PropertyValue Property="CollectionPath" String="Currencies"/>
          </Record>
        </Annotation>
      </Annotations>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

describe('own code list declared through the schema alias', () => {
    it('is generated as a currency code list with ISO minor units and needs no referenced service', async () => {
        const metadata: MockDataMetadata = { format: 'edmx', content: aliasedOwnCodeList };

        const result = await generateService(
            {
                metadata,
                service: { urlPath: SERVICE_PATH, odataVersion: '4.0' },
                targets: [
                    { name: 'Currencies', kind: 'entity-set' },
                    { name: 'Invoices', kind: 'entity-set' }
                ],
                existingData: {}
            },
            { mode: 'deterministic', seed: 1, rowsPerEntity: 5 }
        );

        expect(parseEdmx(aliasedOwnCodeList).entities.find(({ name }) => name === 'Currency')?.codeList).toBe(
            'currency'
        );
        expect(
            describeReferencedServices({ metadata, service: { urlPath: SERVICE_PATH, odataVersion: '4.0' } })
        ).toEqual([]);
        expect(result.referencedResources).toBeUndefined();
        expect(result.resources.Currencies?.length).toBeGreaterThan(0);
        for (const row of result.resources.Currencies ?? []) {
            expect(row.ISOCode).toMatch(/^[A-Z]{3}$/u);
            expect(row.DecimalPlaces).toBe(currencyFractionDigits(String(row.ISOCode)));
        }
    });
});
