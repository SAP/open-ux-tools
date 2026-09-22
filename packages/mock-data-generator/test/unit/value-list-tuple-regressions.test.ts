import { generateService } from '../../src/index.js';
import { finalizeSemanticServiceWorld } from '../../src/generation/service-world.js';
import { semanticValueIsValid } from '../../src/generation/semantic-plan.js';
import { validateTupleDomains } from '../../src/generation/tuple-domain.js';
import { parseEdmx } from '../../src/schema/edmx.js';
import type {
    MockDataGeneratorDiagnostic,
    MockDataGeneratorOptions,
    MockDataGeneratorRuntime,
    MockDataRow,
    MockDataServiceRequest,
    SemanticClassification
} from '../../src/types.js';

// Synthetic services, one per root cause of "Semantic tuple validation failed" seen on real
// services. Every service must generate, and every generated row that references a value list must
// be a member of one of its tuples, parameters and display texts included.

const options: MockDataGeneratorOptions = { pipeline: 'semantic-v2', rowsPerEntity: 10, seed: 1 };

// The editor's generation path with no model output: the model proposes nothing and the relevance
// verifier accepts nothing, so every value comes from the deterministic tiers.
const runtime: MockDataGeneratorRuntime = {
    sft: { fingerprint: 'no-model-output', generate: async () => ({ rows: [] }) },
    candidateVerifier: { fingerprint: 'declines-all', verifyBatch: async (pairs) => pairs.map(() => false) }
};

function v4(entityTypes: string, entitySets: ReadonlyArray<string>): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
<edmx:DataServices><Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Demo">
${entityTypes}
<EntityContainer Name="Container">
${entitySets.map((name) => `<EntitySet Name="${name}s" EntityType="Demo.${name}"/>`).join('\n')}
</EntityContainer>
</Schema></edmx:DataServices>
</edmx:Edmx>`;
}

function valueList(collection: string, parameters: string): string {
    return `<Annotation Term="Common.ValueList"><Record>
<PropertyValue Property="CollectionPath" String="${collection}"/>
<PropertyValue Property="Parameters"><Collection>${parameters}</Collection></PropertyValue>
</Record></Annotation>`;
}

function parameter(direction: 'In' | 'InOut' | 'Out', local: string, valueListProperty: string): string {
    return `<Record Type="Common.ValueListParameter${direction}"><PropertyValue Property="LocalDataProperty" PropertyPath="${local}"/><PropertyValue Property="ValueListProperty" String="${valueListProperty}"/></Record>`;
}

function request(
    metadata: string,
    entitySets: ReadonlyArray<string>,
    odataVersion: '2.0' | '4.0' = '4.0'
): MockDataServiceRequest {
    return {
        metadata: { format: 'edmx', content: metadata },
        service: { urlPath: '/demo/', odataVersion },
        targets: entitySets.map((name) => ({ name, kind: 'entity-set' as const })),
        existingData: {}
    };
}

function invalidTuples(metadata: string, resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>): string[] {
    return validateTupleDomains(parseEdmx(metadata), resources, {})
        .filter(({ code }) => code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID')
        .map(({ target }) => target);
}

describe('value-list tuple regressions', () => {
    it('mirrors only the text of the key the owner itself maps when a value help has several text-bearing keys', async () => {
        // Given a cost-center value help keyed by cost center and area, each key with its own text,
        // and an owner whose single text describes its cost center
        const metadata = v4(
            `<EntityType Name="CostCenter"><Key><PropertyRef Name="CostCenter"/><PropertyRef Name="Area"/></Key>
<Property Name="CostCenter" Type="Edm.String" MaxLength="10" Nullable="false"><Annotation Term="Common.Text" Path="CostCenterName"/></Property>
<Property Name="Area" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="AreaName"/></Property>
<Property Name="CostCenterName" Type="Edm.String" MaxLength="20"/>
<Property Name="AreaName" Type="Edm.String" MaxLength="6"/>
</EntityType>
<EntityType Name="Budget"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="CostCenter" Type="Edm.String" MaxLength="10"><Annotation Term="Common.Text" Path="CostCenterName"/>
${valueList('CostCenters', parameter('InOut', 'CostCenter', 'CostCenter') + parameter('InOut', 'Area', 'Area'))}</Property>
<Property Name="Area" Type="Edm.String" MaxLength="4"/>
<Property Name="CostCenterName" Type="Edm.String" MaxLength="20"/>
</EntityType>`,
            ['CostCenter', 'Budget']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['CostCenters', 'Budgets']), options, runtime);

        // Then each budget shows its own cost center's name, not the area's
        const costCenters = result.resources.CostCenters;
        for (const budget of result.resources.Budgets) {
            const costCenter = costCenters.find(
                (row) => row.CostCenter === budget.CostCenter && row.Area === budget.Area
            );
            expect(budget.CostCenterName).toBe(costCenter?.CostCenterName);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('binds an unprotected In parameter to the selected value-help tuple', async () => {
        // Given a storage bin value help filtered by its site through an In parameter, and an
        // owner whose site field is an ordinary generated field
        const metadata = v4(
            `<EntityType Name="Bin"><Key><PropertyRef Name="Site"/><PropertyRef Name="Bin"/></Key>
<Property Name="Site" Type="Edm.String" MaxLength="4" Nullable="false"/>
<Property Name="Bin" Type="Edm.String" MaxLength="10" Nullable="false"><Annotation Term="Common.Text" Path="BinName"/></Property>
<Property Name="BinName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="Movement"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="TargetBin" Type="Edm.String" MaxLength="10">
${valueList('Bins', parameter('InOut', 'TargetBin', 'Bin') + parameter('In', 'TargetSite', 'Site'))}</Property>
<Property Name="TargetSite" Type="Edm.String" MaxLength="4"/>
</EntityType>`,
            ['Bin', 'Movement']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['Bins', 'Movements']), options, runtime);

        // Then every movement's site is the site of the bin it references
        for (const movement of result.resources.Movements) {
            expect(
                result.resources.Bins.some((bin) => bin.Bin === movement.TargetBin && bin.Site === movement.TargetSite)
            ).toBe(true);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it.each([
        {
            // The area list binds the shared area first; the company value help's areas are unrelated.
            scenario: 'the area value list binds the shared area before the company value list',
            areaListFirst: true,
            companyAreaHasValueList: false
        },
        {
            // The company list binds company and area first; the company value help's own area value list
            // then rewrites that area, so the earlier binding goes stale.
            scenario: 'the company value help projects its own area after the owner bound it',
            areaListFirst: false,
            companyAreaHasValueList: true
        }
    ])(
        'keeps a field shared by two value lists consistent with both when $scenario',
        async ({ areaListFirst, companyAreaHasValueList }) => {
            // Given an owner that selects its area through the area value list and through the company
            // value list, generated before the company value help
            const areaList = `<Property Name="Area" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="AreaName"/>
${valueList('Areas', parameter('InOut', 'Area', 'Area'))}</Property>
<Property Name="AreaName" Type="Edm.String" MaxLength="25"/>`;
            const companyList = `<Property Name="Company" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="CompanyName"/>
${valueList('Companys', parameter('InOut', 'Company', 'Company') + parameter('InOut', 'Area', 'Area'))}</Property>
<Property Name="CompanyName" Type="Edm.String" MaxLength="25"/>`;
            const metadata = v4(
                `<EntityType Name="Area"><Key><PropertyRef Name="Area"/></Key>
<Property Name="Area" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="AreaName"/></Property>
<Property Name="AreaName" Type="Edm.String" MaxLength="25"/>
</EntityType>
<EntityType Name="ChangeLog"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
${areaListFirst ? areaList + companyList : companyList + areaList}
</EntityType>
<EntityType Name="Company"><Key><PropertyRef Name="Company"/></Key>
<Property Name="Company" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="CompanyName"/></Property>
<Property Name="CompanyName" Type="Edm.String" MaxLength="25"/>
${
    companyAreaHasValueList
        ? `<Property Name="Area" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="AreaName"/>${valueList('Areas', parameter('InOut', 'Area', 'Area'))}</Property>`
        : '<Property Name="Area" Type="Edm.String" MaxLength="4"/>'
}
<Property Name="AreaName" Type="Edm.String" MaxLength="25"/>
</EntityType>`,
                ['Area', 'ChangeLog', 'Company']
            );

            // When the service is generated
            const result = await generateService(
                request(metadata, ['Areas', 'ChangeLogs', 'Companys']),
                options,
                runtime
            );

            // Then every change log's company and area form a company tuple, and its area is a known area
            for (const log of result.resources.ChangeLogs) {
                expect(
                    result.resources.Companys.some(
                        (company) => company.Company === log.Company && company.Area === log.Area
                    )
                ).toBe(true);
                expect(result.resources.Areas.some((area) => area.Area === log.Area)).toBe(true);
            }
            expect(invalidTuples(metadata, result.resources)).toEqual([]);
        }
    );

    it('adds value-help codes that fit an owner field narrower than the value-help key', async () => {
        // Given a status value help keyed by a 10-character code, referenced by a 2-character owner field
        const metadata = v4(
            `<EntityType Name="Status"><Key><PropertyRef Name="Status"/></Key>
<Property Name="Status" Type="Edm.String" MaxLength="10" Nullable="false"><Annotation Term="Common.Text" Path="StatusText"/></Property>
<Property Name="StatusText" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityType Name="Instruction"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Status" Type="Edm.String" MaxLength="2"><Annotation Term="Common.Text" Path="StatusText"/>
${valueList('Statuss', parameter('InOut', 'Status', 'Status'))}</Property>
<Property Name="StatusText" Type="Edm.String" MaxLength="60"/>
</EntityType>`,
            ['Status', 'Instruction']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['Statuss', 'Instructions']), options, runtime);

        // Then every instruction status is a status code of the value help, with its text
        for (const instruction of result.resources.Instructions) {
            const status = result.resources.Statuss.find((row) => row.Status === instruction.Status);
            expect(status?.StatusText).toBe(instruction.StatusText);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('adds value-help rows that satisfy a declared constant parameter', async () => {
        // Given a planning-level value help restricted to one source by a constant parameter
        const metadata = v4(
            `<EntityType Name="Level"><Key><PropertyRef Name="Level"/></Key>
<Property Name="Level" Type="Edm.String" MaxLength="2" Nullable="false"><Annotation Term="Common.Text" Path="LevelText"/></Property>
<Property Name="LevelText" Type="Edm.String" MaxLength="30"/>
<Property Name="Source" Type="Edm.String" MaxLength="3"/>
</EntityType>
<EntityType Name="Account"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Level" Type="Edm.String" MaxLength="2"><Annotation Term="Common.Text" Path="LevelText"/>
${valueList(
    'Levels',
    parameter('InOut', 'Level', 'Level') +
        '<Record Type="Common.ValueListParameterConstant"><PropertyValue Property="ValueListProperty" String="Source"/><PropertyValue Property="Constant" String="BNK"/></Record>'
)}</Property>
<Property Name="LevelText" Type="Edm.String" MaxLength="30"/>
</EntityType>`,
            ['Level', 'Account']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['Levels', 'Accounts']), options, runtime);

        // Then every account level is a level from the constant's source
        for (const account of result.resources.Accounts) {
            const level = result.resources.Levels.find((row) => row.Level === account.Level);
            expect(level?.Source).toBe('BNK');
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('fits a value-help text copied by an Out parameter into a narrower local text', async () => {
        // Given a unit value help whose 60-character description is copied into a 10-character
        // owner text by an Out parameter
        const metadata = v4(
            `<EntityType Name="Unit"><Key><PropertyRef Name="Code"/></Key>
<Property Name="Code" Type="Edm.String" MaxLength="3" Nullable="false"><Annotation Term="Common.Text" Path="Description"/></Property>
<Property Name="Description" Type="Edm.String" MaxLength="60"/>
</EntityType>
<EntityType Name="Container"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="QuantityUnit" Type="Edm.String" MaxLength="3"><Annotation Term="Common.Text" Path="QuantityUnitText"/>
${valueList('Units', parameter('InOut', 'QuantityUnit', 'Code') + parameter('Out', 'QuantityUnitText', 'Description'))}</Property>
<Property Name="QuantityUnitText" Type="Edm.String" MaxLength="10"/>
</EntityType>`,
            ['Unit', 'Container']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['Units', 'Containers']), options, runtime);

        // Then each container text holds the leading ten characters of its unit's description
        for (const container of result.resources.Containers) {
            const unit = result.resources.Units.find((row) => row.Code === container.QuantityUnit);
            expect(container.QuantityUnitText).toBe(Array.from(String(unit?.Description)).slice(0, 10).join(''));
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('does not derive a count into a field governed by a value list', async () => {
        // Given a "number of copies" field whose values come from a fixed-values value help
        const metadata = v4(
            `<EntityType Name="CopyCount"><Key><PropertyRef Name="Code"/></Key>
<Property Name="Code" Type="Edm.String" MaxLength="3" Nullable="false"/>
</EntityType>
<EntityType Name="PrintItem"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="PrintNumberOfCopies" Type="Edm.String" MaxLength="3">
${valueList('CopyCounts', parameter('InOut', 'PrintNumberOfCopies', 'Code'))}</Property>
</EntityType>`,
            ['CopyCount', 'PrintItem']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['CopyCounts', 'PrintItems']), options, runtime);

        // Then every copy count is a value-help code
        for (const item of result.resources.PrintItems) {
            expect(result.resources.CopyCounts.some((row) => row.Code === item.PrintNumberOfCopies)).toBe(true);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('copies the provider text of a value-help code added for a protected owner key', async () => {
        // Given owners keyed by a currency that the three generated currencies do not all cover, so
        // the value help gains codes whose names the currency provider supplies, and an owner name
        // that only the value list fills
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:sap="http://www.sap.com/Protocols/SAPData">
<edmx:DataServices m:DataServiceVersion="2.0">
<Schema Namespace="Demo" xml:lang="en" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
<EntityType Name="CurrencyType"><Key><PropertyRef Name="Currency"/></Key>
<Property Name="Currency" Type="Edm.String" Nullable="false" MaxLength="5" sap:text="CurrencyName" sap:semantics="currency-code"/>
<Property Name="CurrencyName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="RateType"><Key><PropertyRef Name="Currency"/></Key>
<Property Name="Currency" Type="Edm.String" Nullable="false" MaxLength="5" sap:text="CurrencyName" sap:semantics="currency-code" sap:value-list="standard"/>
<Property Name="CurrencyName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityContainer Name="Container" m:IsDefaultEntityContainer="true">
<EntitySet Name="Currencies" EntityType="Demo.CurrencyType"/>
<EntitySet Name="Rates" EntityType="Demo.RateType"/>
</EntityContainer>
<Annotations Target="Demo.RateType/Currency" xmlns="http://docs.oasis-open.org/odata/ns/edm">
${valueList('Currencies', parameter('InOut', 'Currency', 'Currency') + parameter('Out', 'CurrencyName', 'CurrencyName'))}
</Annotations>
</Schema>
</edmx:DataServices>
</edmx:Edmx>`;

        // When the service is generated with more owners than value-help rows
        const result = await generateService(
            request(metadata, ['Currencies', 'Rates'], '2.0'),
            { ...options, rowsPerEntity: { Currencies: 3, Rates: 10 } },
            runtime
        );

        // Then every rate shows the name of its currency as the value help states it
        for (const rate of result.resources.Rates) {
            const currency = result.resources.Currencies.find((row) => row.Currency === rate.Currency);
            expect(currency?.CurrencyName).toBe(rate.CurrencyName);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('keeps a value-list display text from the value help even when a format provider could name the code', async () => {
        // Given an owner currency code with currency semantics whose value help is not a currency
        // code list, so the value help's text is the only source of the owner's display text
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns:sap="http://www.sap.com/Protocols/SAPData">
<edmx:DataServices m:DataServiceVersion="2.0">
<Schema Namespace="Demo" xml:lang="en" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
<EntityType Name="CurrencyHelpType"><Key><PropertyRef Name="Currency_ID"/></Key>
<Property Name="Currency_ID" Type="Edm.String" Nullable="false" MaxLength="5" sap:text="CurrencyText"/>
<Property Name="CurrencyText" Type="Edm.String"/>
</EntityType>
<EntityType Name="VoucherType"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.String" Nullable="false"/>
<Property Name="Currency" Type="Edm.String" MaxLength="5" sap:text="Currency_T" sap:semantics="currency-code" sap:value-list="standard"/>
<Property Name="Currency_T" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityContainer Name="Container" m:IsDefaultEntityContainer="true">
<EntitySet Name="Currency" EntityType="Demo.CurrencyHelpType"/>
<EntitySet Name="Vouchers" EntityType="Demo.VoucherType"/>
</EntityContainer>
<Annotations Target="Demo.VoucherType/Currency" xmlns="http://docs.oasis-open.org/odata/ns/edm">
${valueList('Currency', parameter('InOut', 'Currency', 'Currency_ID'))}
</Annotations>
</Schema>
</edmx:DataServices>
</edmx:Edmx>`;

        // When the service is generated
        const result = await generateService(request(metadata, ['Currency', 'Vouchers'], '2.0'), options, runtime);

        // Then every voucher shows the value help's text for its currency
        for (const voucher of result.resources.Vouchers) {
            const currency = result.resources.Currency.find((row) => row.Currency_ID === voucher.Currency);
            expect(voucher.Currency_T).toBe(currency?.CurrencyText);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('does not link a child to a parent through a field that a value list governs', async () => {
        // Given plans that count their items, and items whose plan field is governed by a separate
        // plan value help, so the plan name alone does not link an item to a plan row
        const metadata = v4(
            `<EntityType Name="Plan"><Key><PropertyRef Name="Plan"/></Key>
<Property Name="Plan" Type="Edm.String" MaxLength="10" Nullable="false"/>
<Property Name="NumberOfItems" Type="Edm.Int32"/>
</EntityType>
<EntityType Name="PlanHelp"><Key><PropertyRef Name="Plan"/></Key>
<Property Name="Plan" Type="Edm.String" MaxLength="12" Nullable="false"><Annotation Term="Common.Text" Path="PlanText"/></Property>
<Property Name="PlanText" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="Item"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Plan" Type="Edm.String" MaxLength="12">${valueList('PlanHelps', parameter('InOut', 'Plan', 'Plan'))}</Property>
</EntityType>`,
            ['Plan', 'PlanHelp', 'Item']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['Plans', 'PlanHelps', 'Items']), options, runtime);

        // Then every item's plan is a plan of the value help
        for (const item of result.resources.Items) {
            expect(result.resources.PlanHelps.some((row) => row.Plan === item.Plan)).toBe(true);
        }
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('does not derive a count into a value-help key whose name reads like a count', async () => {
        // Given a bill-of-material item value help keyed by an item number, which the count heuristic
        // would otherwise treat as a "number of" field
        const metadata = v4(
            `<EntityType Name="BomItem"><Key><PropertyRef Name="Material"/><PropertyRef Name="BillOfMaterialItemNumber"/></Key>
<Property Name="Material" Type="Edm.String" MaxLength="40" Nullable="false"/>
<Property Name="BillOfMaterialItemNumber" Type="Edm.String" MaxLength="4" Nullable="false"/>
</EntityType>
<EntityType Name="ChangeItem"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Material" Type="Edm.String" MaxLength="40"/>
<Property Name="BillOfMaterialItemNumber" Type="Edm.String" MaxLength="4">
${valueList(
    'BomItems',
    parameter('InOut', 'Material', 'Material') +
        parameter('InOut', 'BillOfMaterialItemNumber', 'BillOfMaterialItemNumber')
)}</Property>
</EntityType>`,
            ['BomItem', 'ChangeItem']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['BomItems', 'ChangeItems']), options, runtime);

        // Then the value help keeps distinct keys and every change item references one of them
        const keys = result.resources.BomItems.map((row) => `${row.Material}/${row.BillOfMaterialItemNumber}`);
        expect(new Set(keys).size).toBe(keys.length);
        expect(invalidTuples(metadata, result.resources)).toEqual([]);
    });

    it('orders value-help dates before owners copy them', () => {
        // Given a validity value help whose valid-from must not follow its key date, with a row that
        // violates the order, and an owner that copies the key date through an In parameter
        const metadata = v4(
            `<EntityType Name="Validity"><Key><PropertyRef Name="Code"/></Key>
<Property Name="Code" Type="Edm.String" MaxLength="4" Nullable="false"/>
<Property Name="ValidFrom" Type="Edm.Date"/>
<Property Name="KeyDate" Type="Edm.Date"/>
</EntityType>
<EntityType Name="Assignment"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Code" Type="Edm.String" MaxLength="4">
${valueList('Validitys', parameter('InOut', 'Code', 'Code') + parameter('In', 'KeyDate', 'KeyDate'))}</Property>
<Property Name="KeyDate" Type="Edm.Date"/>
</EntityType>`,
            ['Validity', 'Assignment']
        );
        const graph = parseEdmx(metadata);

        // When the service world is finalized with the explicit ordering
        const result = finalizeSemanticServiceWorld(
            graph,
            {
                Validitys: [{ Code: 'A', ValidFrom: '2026-05-01', KeyDate: '2026-01-01' }],
                Assignments: [{ ID: 1, Code: 'none', KeyDate: '2025-06-01' }]
            },
            {},
            1,
            new Map(),
            [],
            {},
            new Map(),
            [{ resource: 'Validitys', before: 'ValidFrom', after: 'KeyDate' }]
        );

        // Then the value help is ordered and the owner holds the ordered key date
        expect(result.Validitys).toEqual([{ Code: 'A', ValidFrom: '2026-01-01', KeyDate: '2026-05-01' }]);
        expect(result.Assignments).toEqual([{ ID: 1, Code: 'A', KeyDate: '2026-05-01' }]);
        expect(invalidTuples(metadata, result)).toEqual([]);
    });

    it('never adds a value-help row carrying a column the value-help entity does not declare', async () => {
        // Given a value list whose second parameter names a value-help column that does not exist,
        // so no value-help row can satisfy it and the domain cannot be extended with it
        const metadata = v4(
            `<EntityType Name="WorkCenter"><Key><PropertyRef Name="WorkCenterID"/></Key>
<Property Name="WorkCenterID" Type="Edm.String" MaxLength="8" Nullable="false"/>
</EntityType>
<EntityType Name="Bucket"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="MainWorkCenter" Type="Edm.String" MaxLength="8">
${valueList('WorkCenters', parameter('InOut', 'MainWorkCenter', 'WorkCenterID') + parameter('InOut', 'Plant', 'WorkCenter'))}</Property>
<Property Name="Plant" Type="Edm.String" MaxLength="4"/>
</EntityType>`,
            ['WorkCenter', 'Bucket']
        );

        // When the service is generated
        const result = await generateService(request(metadata, ['WorkCenters', 'Buckets']), options, runtime);

        // Then the value help holds only declared columns and the list is reported as unverifiable
        for (const row of result.resources.WorkCenters) {
            expect(Object.keys(row)).toEqual(['WorkCenterID']);
        }
        expect(
            result.diagnostics.some(
                ({ code, target }) =>
                    code === 'SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE' && target === 'Buckets.MainWorkCenter'
            )
        ).toBe(true);
    });

    it('adopts one value for a field that is both an In and an Out parameter of the same value list', () => {
        // Given a G/L account value help filtered by an alternative account (In) that returns the
        // account (Out) into the same owner field, where no value-help row has equal columns
        const metadata = v4(
            `<EntityType Name="GLAccount"><Key><PropertyRef Name="Account"/><PropertyRef Name="Chart"/></Key>
<Property Name="Account" Type="Edm.String" MaxLength="10" Nullable="false"/>
<Property Name="Chart" Type="Edm.String" MaxLength="4" Nullable="false"/>
<Property Name="AlternativeAccount" Type="Edm.String" MaxLength="10"/>
</EntityType>
<EntityType Name="BankAccount"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="GLAccount" Type="Edm.String" MaxLength="10">
${valueList('GLAccounts', parameter('In', 'GLAccount', 'AlternativeAccount') + parameter('Out', 'GLAccount', 'Account'))}</Property>
</EntityType>`,
            ['GLAccount', 'BankAccount']
        );
        const graph = parseEdmx(metadata);

        // When the service world is finalized
        const result = finalizeSemanticServiceWorld(
            graph,
            {
                GLAccounts: [
                    { Account: '100', Chart: 'C1', AlternativeAccount: '900' },
                    { Account: '200', Chart: 'C1', AlternativeAccount: '800' }
                ],
                BankAccounts: [{ ID: 1, GLAccount: '555' }]
            },
            {},
            1
        );

        // Then the bank account's G/L account is both the account and the alternative account of one row
        const glAccount = result.BankAccounts[0].GLAccount;
        expect(result.GLAccounts.some((row) => row.Account === glAccount && row.AlternativeAccount === glAccount)).toBe(
            true
        );
        expect(invalidTuples(metadata, result)).toEqual([]);
    });

    it('does not project a value-help value that violates the owner field semantic role', () => {
        // Given a fax number owner field classified as a phone number, and a value help whose keys
        // are generated placeholders
        const metadata = v4(
            `<EntityType Name="FaxContact"><Key><PropertyRef Name="Fax"/></Key>
<Property Name="Fax" Type="Edm.String" MaxLength="30" Nullable="false"/>
</EntityType>
<EntityType Name="Output"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Fax" Type="Edm.String" MaxLength="30">
${valueList('FaxContacts', parameter('InOut', 'Fax', 'Fax'))}</Property>
</EntityType>`,
            ['FaxContact', 'Output']
        );
        const graph = parseEdmx(metadata);
        const phone: SemanticClassification = { role: 'phone', confidence: 1, source: 'classifier' };

        // When the service world is finalized with that classification
        const result = finalizeSemanticServiceWorld(
            graph,
            { FaxContacts: [{ Fax: 'K000001' }, { Fax: 'K000002' }], Outputs: [{ ID: 1, Fax: '+49 6227 7000' }] },
            {},
            1,
            new Map([['Outputs.Fax', phone]])
        );

        // Then the owner keeps a valid phone number that the value help contains
        const fax = result.Outputs[0].Fax;
        const property = graph.entities.find(({ entitySetName }) => entitySetName === 'Outputs')?.properties[1];
        expect(property && semanticValueIsValid('phone', property, fax)).toBe(true);
        expect(result.FaxContacts.some((row) => row.Fax === fax)).toBe(true);
        expect(invalidTuples(metadata, result)).toEqual([]);
    });

    it('chooses tuples jointly when a shared text and a third value list exclude every greedy choice', () => {
        // Given two access-level value lists that share the owner's level text, and a profile value
        // list that pins the edit level's profile
        const metadata = v4(
            `<EntityType Name="Profile"><Key><PropertyRef Name="Profile"/></Key>
<Property Name="Profile" Type="Edm.String" MaxLength="4" Nullable="false"/>
</EntityType>
<EntityType Name="EditLevel"><Key><PropertyRef Name="Level"/><PropertyRef Name="Profile"/></Key>
<Property Name="Level" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="LevelName"/></Property>
<Property Name="Profile" Type="Edm.String" MaxLength="4" Nullable="false"/>
<Property Name="LevelName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="FilterLevel"><Key><PropertyRef Name="Level"/></Key>
<Property Name="Level" Type="Edm.String" MaxLength="4" Nullable="false"><Annotation Term="Common.Text" Path="LevelName"/></Property>
<Property Name="LevelName" Type="Edm.String" MaxLength="40"/>
</EntityType>
<EntityType Name="Transaction"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Profile" Type="Edm.String" MaxLength="4">${valueList('Profiles', parameter('InOut', 'Profile', 'Profile'))}</Property>
<Property Name="EditLevel" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="LevelName"/>
${valueList('EditLevels', parameter('InOut', 'EditLevel', 'Level') + parameter('InOut', 'Profile', 'Profile'))}</Property>
<Property Name="FilterLevel" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="LevelName"/>
${valueList('FilterLevels', parameter('InOut', 'FilterLevel', 'Level'))}</Property>
<Property Name="LevelName" Type="Edm.String" MaxLength="40"/>
</EntityType>`,
            ['Profile', 'EditLevel', 'FilterLevel', 'Transaction']
        );
        const graph = parseEdmx(metadata);

        // When the service world is finalized
        const result = finalizeSemanticServiceWorld(
            graph,
            {
                Profiles: [{ Profile: 'P1' }, { Profile: 'P2' }],
                EditLevels: [
                    { Level: 'E1', Profile: 'P1', LevelName: 'Alpha' },
                    { Level: 'E2', Profile: 'P2', LevelName: 'Beta' }
                ],
                FilterLevels: [{ Level: 'F1', LevelName: 'Beta' }],
                Transactions: [{ ID: 1, Profile: 'P0', EditLevel: 'E0', FilterLevel: 'F1', LevelName: 'none' }]
            },
            {},
            1
        );

        // Then the only consistent choice is taken: profile P2, edit level E2 and filter level F1
        expect(result.Transactions).toEqual([
            { ID: 1, Profile: 'P2', EditLevel: 'E2', FilterLevel: 'F1', LevelName: 'Beta' }
        ]);
        expect(invalidTuples(metadata, result)).toEqual([]);
    });
});

describe('tuple conflict classification', () => {
    // Two authored value lists share the Area field; only their domains decide whether a row can
    // satisfy both.
    const metadata = v4(
        `<EntityType Name="Area"><Key><PropertyRef Name="Area"/></Key>
<Property Name="Area" Type="Edm.String" MaxLength="4" Nullable="false"/>
</EntityType>
<EntityType Name="Company"><Key><PropertyRef Name="Company"/></Key>
<Property Name="Company" Type="Edm.String" MaxLength="4" Nullable="false"/>
<Property Name="Area" Type="Edm.String" MaxLength="4"/>
</EntityType>
<EntityType Name="Order"><Key><PropertyRef Name="ID"/></Key>
<Property Name="ID" Type="Edm.Int32" Nullable="false"/>
<Property Name="Area" Type="Edm.String" MaxLength="4">${valueList('Areas', parameter('InOut', 'Area', 'Area'))}</Property>
<Property Name="Company" Type="Edm.String" MaxLength="4">
${valueList('Companys', parameter('InOut', 'Company', 'Company') + parameter('InOut', 'Area', 'Area'))}</Property>
</EntityType>`,
        ['Area', 'Company', 'Order']
    );
    const codes = (resources: Readonly<Record<string, ReadonlyArray<MockDataRow>>>): string[] =>
        validateTupleDomains(parseEdmx(metadata), resources, {})
            .filter(({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT' || code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID')
            .map(({ code, target }) => `${code} ${target}`);

    it('reports a conflict when two value lists over the same field have no common tuple', () => {
        // Given company areas that are not areas of the area value help
        const resources = {
            Areas: [{ Area: 'A1' }],
            Companys: [{ Company: 'C1', Area: 'Z9' }],
            Orders: [{ ID: 1, Area: 'A1', Company: 'C1' }]
        };
        // When the rows are validated
        // Then the company tuple is a domain conflict, not a membership failure
        expect(codes(resources)).toEqual(['SEMANTIC_DOMAIN_CONFLICT Orders.Company']);
    });

    it('reports a membership failure when a tuple compatible with both value lists exists', () => {
        // Given a company whose area is also a valid area, but a row that ignores it
        const resources = {
            Areas: [{ Area: 'A1' }, { Area: 'A2' }],
            Companys: [{ Company: 'C1', Area: 'A2' }],
            Orders: [{ ID: 1, Area: 'A1', Company: 'C1' }]
        };
        // When the rows are validated
        // Then the row could have been a member of both lists, so it is an invalid tuple
        expect(codes(resources)).toEqual(['SEMANTIC_TUPLE_MEMBERSHIP_INVALID Orders.Company']);
    });

    it('counts a value list whose display text cannot be resolved as a constraint on shared fields', () => {
        // Given an area value list whose text path cannot be resolved, so its own membership is not
        // validated, but which still determines the area that the company value list shares
        const unresolvedText = metadata.replace(
            '<Property Name="Area" Type="Edm.String" MaxLength="4"><Annotation Term="Common.ValueList">',
            '<Property Name="Area" Type="Edm.String" MaxLength="4"><Annotation Term="Common.Text" Path="to_Area/AreaName"/><Annotation Term="Common.ValueList">'
        );
        const resources = {
            Areas: [{ Area: 'A1' }],
            Companys: [{ Company: 'C1', Area: 'Z9' }],
            Orders: [{ ID: 1, Area: 'A1', Company: 'C1' }]
        };
        // When the rows are validated
        const diagnostics: ReadonlyArray<MockDataGeneratorDiagnostic> = validateTupleDomains(
            parseEdmx(unresolvedText),
            resources,
            {}
        );
        // Then the company tuple is still a domain conflict with the area list
        expect(
            diagnostics
                .filter(
                    ({ code }) => code === 'SEMANTIC_DOMAIN_CONFLICT' || code === 'SEMANTIC_TUPLE_MEMBERSHIP_INVALID'
                )
                .map(({ code, target }) => `${code} ${target}`)
        ).toEqual(['SEMANTIC_DOMAIN_CONFLICT Orders.Company']);
    });

    it('reports a parameter that names no value-list property as unverified context, not an invalid tuple', () => {
        // Given an owner parameter that maps a local field without naming the value-help column
        const malformed = metadata.replace('<PropertyValue Property="ValueListProperty" String="Company"/>', '');
        const resources = {
            Areas: [{ Area: 'A1' }],
            Companys: [{ Company: 'C1', Area: 'A1' }],
            Orders: [{ ID: 1, Area: 'A1', Company: 'C1' }]
        };
        // When the rows are validated
        const diagnostics = validateTupleDomains(parseEdmx(malformed), resources, {}).map(
            ({ code, target }) => `${code} ${target}`
        );
        // Then the company list is reported as unverifiable and not as a membership failure
        expect(diagnostics).toEqual(['SEMANTIC_TUPLE_CONTEXT_UNAVAILABLE Orders.Company']);
    });

    it('reports a conflict when no value-help value fits the local field', () => {
        // Given an area value help whose only code is longer than the owner's 4-character field
        const resources = { Areas: [{ Area: 'TOO-LONG' }], Orders: [{ ID: 1, Area: 'A1' }] };
        // When the rows are validated
        // Then no tuple can be adopted, so the row is a domain conflict
        expect(codes(resources)).toEqual(['SEMANTIC_DOMAIN_CONFLICT Orders.Area']);
    });
});
