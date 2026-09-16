import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));

function renderListReportJourney(bucket: string, tabs: unknown[], navigatedOPTabKey?: string): string {
    const templatePath = join(__dirname, `../../templates/v4/${bucket}/integration/ListReportJourney.js`);
    const fs = create(createStorage());
    const out = join(__dirname, `lr.${bucket}.gen.js`);
    fs.copyTpl(templatePath, out, {
        name: 'Customer',
        startPages: ['CustomerList'],
        startLR: 'CustomerList',
        navigatedOP: 'CustomerObjectPage',
        navigatedOPTabKey,
        hideFilterBar: false,
        filterBarItems: [],
        tableColumns: {},
        contactCardColumns: [],
        toolBarActions: [],
        createButton: { visible: false },
        deleteButton: { visible: false },
        isALP: false,
        semanticKey: {},
        textAnnotationColumns: [],
        tableIdentifiers: ['1', '6'],
        tabs
    });
    return fs.read(out);
}

const tabs = [
    {
        key: '1',
        entitySet: 'Customer',
        tableColumns: { CompanyCode: { header: 'Company Code' } },
        contactCardColumns: [{ property: 'DataFieldForAnnotation::_UserContactCard::Contact' }],
        toolBarActions: [{ label: 'Navigate', action: 'Navigate', visible: true, enabled: true }],
        createButton: { visible: true },
        deleteButton: { visible: false }
    },
    {
        key: '6',
        entitySet: 'CompanyCodeDetail',
        tableColumns: { CompanyCode: { header: 'Company Code' } },
        contactCardColumns: [],
        toolBarActions: [],
        createButton: { visible: false },
        deleteButton: { visible: false }
    }
];

describe.each(['latest', '1.148'])('ListReportJourney template (%s) - multi-tab', (bucket) => {
    const content = renderListReportJourney(bucket, tabs);

    test('runs the column/action checks for each tab via onTable("<key>")', () => {
        expect(content).toContain('iGoToView({ key: "1" })');
        expect(content).toContain('iGoToView({ key: "6" })');
        expect(content).toContain('onTable("1").iCheckColumns(undefined, {"CompanyCode":{"header":"Company Code"}})');
        expect(content).toContain('onTable("6").iCheckColumns(undefined, {"CompanyCode":{"header":"Company Code"}})');
        expect(content).toContain('onTable("1").iCheckRows()');
        expect(content).toContain('onTable("6").iCheckRows()');
    });

    test('navigates to the object page from the default tab when no originating tab is resolved', () => {
        // No navigatedOPTabKey → fall back to the first tab (tableIdentifiers[0] = "1").
        expect(content).toContain('onTable("1").iPressRow(0)');
        expect(content).toContain('Then.onTheCustomerObjectPageGenerated.iSeeThisPage()');
    });

    test('navigates from the resolved originating tab when the OP lives on a non-default tab', () => {
        const nonDefault = renderListReportJourney(bucket, tabs, '6');
        expect(nonDefault).toContain('onTable("6").iPressRow(0)');
        expect(nonDefault).toContain('Then.onTheCustomerObjectPageGenerated.iSeeThisPage()');
        // The row must NOT be pressed on the default tab, which would open the wrong Object Page.
        expect(nonDefault).not.toContain('onTable("1").iPressRow(0)');
    });
});

describe('ListReportJourney template (latest) - multi-tab tab-specific checks', () => {
    const content = renderListReportJourney('latest', tabs);

    test('checks the tab-specific toolbar action and create button on its own tab', () => {
        expect(content).toContain('onTable("1").iCheckAction("Navigate", { enabled: true })');
        expect(content).toContain('onTable("1").iCheckCreate({ visible: true })');
    });

    test('checks the tab-specific contact card link on its own tab', () => {
        expect(content).toContain('onTable("1").iClickLink(0, "DataFieldForAnnotation::_UserContactCard::Contact")');
    });
});
