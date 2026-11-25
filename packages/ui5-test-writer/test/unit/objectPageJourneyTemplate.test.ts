import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../../templates/v4/latest/integration/ObjectPageJourney.js');

function makeSubSection(id: string, property: string) {
    return { id, fields: [{ property }], contactCardFields: [], contactCardColumns: [], tableColumns: {} };
}

function renderJourney(bodySections: unknown[], template: string = templatePath): string {
    const fs = create(createStorage());
    const ext = template.endsWith('.ts') ? '.ts' : '.js';
    const out = join(__dirname, `out.gen${ext}`);
    fs.copyTpl(template, out, {
        name: 'GLLineItem',
        navigationParents: {
            parentLRName: '',
            parentLRViewKey: undefined,
            parentLRViewIsDefault: undefined,
            parentOPs: []
        },
        hideFilterBar: false,
        headerActions: [],
        headerSections: [],
        editButton: undefined,
        headerTitle: undefined,
        serviceUri: '/odata/v4/TestService/',
        bodySections
    });
    return fs.read(out);
}

describe('ObjectPageJourney template - sub-section assertions', () => {
    test('single sub-section is checked via the section only, not iCheckSubSection', () => {
        const content = renderJourney([
            {
                id: 'GeneralInformation',
                isTable: false,
                actions: [],
                contactCardColumns: [],
                contactCardFields: [],
                fields: [],
                tableColumns: {},
                subSections: [makeSubSection('GeneralInformation', 'AccountingDocument')]
            }
        ]);
        expect(content).not.toContain('iCheckSubSection');
        expect(content).not.toContain('subSection:');
        expect(content).toContain('iCheckSection({ section: "GeneralInformation" })');
        expect(content).toContain(
            'onForm({ section: "GeneralInformation" }).iCheckField({ property: "AccountingDocument" })'
        );
        // When is unused (no iGoToSection/iCheckSubSection emitted), so it must be prefixed with _
        expect(content).toContain('function (_Given, _When, Then)');
    });

    test('multiple sub-sections are each checked via iCheckSubSection', () => {
        const content = renderJourney([
            {
                id: 'Details',
                isTable: false,
                actions: [],
                contactCardColumns: [],
                contactCardFields: [],
                fields: [],
                tableColumns: {},
                subSections: [makeSubSection('S1', 'X'), makeSubSection('S2', 'Y')]
            }
        ]);
        expect(content).toContain('iGoToSection({ section: "Details", subSection: "S1" })');
        expect(content).toContain('iGoToSection({ section: "Details", subSection: "S2" })');
        expect(content).toContain('iCheckSubSection({ section: "S1" })');
        expect(content).toContain('iCheckSubSection({ section: "S2" })');
        // When is used by iGoToSection, so it must not be prefixed with _
        expect(content).toContain('function (_Given, When, Then)');
    });

    test('single sub-section with a contact-card link keeps When (iClickLink uses it)', () => {
        const content = renderJourney([
            {
                id: 'GeneralInformation',
                isTable: false,
                actions: [],
                contactCardColumns: [],
                contactCardFields: [],
                fields: [],
                tableColumns: {},
                subSections: [
                    {
                        id: 'GeneralInformation',
                        fields: [{ property: 'Author' }],
                        contactCardFields: [{ property: 'Author' }],
                        contactCardColumns: [],
                        tableColumns: {}
                    }
                ]
            }
        ]);
        expect(content).not.toContain('iCheckSubSection');
        expect(content).toContain('iClickLink({ property: "Author" })');
        expect(content).toContain('function (_Given, When, Then)');
    });
});

describe('ObjectPageJourney template (1.84 bucket) - empty section guard', () => {
    const buckets = [
        ['JS', join(__dirname, '../../templates/v4/1.84/integration/ObjectPageJourney.js')],
        ['TS', join(__dirname, '../../templates/v4/1.84/integration/ObjectPageJourney.ts')]
    ] as const;

    // A plain table section below 1.120 has no iCheckColumns/iCheckSection to emit, and with no
    // actions, create/delete buttons or form fields its only output would be the section-tab press.
    // OPA5 rejects a test that runs zero assertions ("Expected at least one assertion, but none were
    // run"), so the whole opaTest block must be skipped for such a section.
    const bareTableSection = {
        id: 'BookingSupplement',
        isTable: true,
        navigationProperty: '_BookSupplement',
        actions: [],
        contactCardColumns: [],
        contactCardFields: [],
        fields: [],
        tableColumns: {},
        subSections: []
    };
    const sectionWithField = {
        id: 'GeneralInformation',
        isTable: false,
        navigationProperty: undefined,
        actions: [],
        contactCardColumns: [],
        contactCardFields: [],
        fields: [{ property: 'BookingID' }],
        tableColumns: {},
        subSections: []
    };

    test.each(buckets)('%s: omits the opaTest block for a bare table section with no assertions', (_name, tpl) => {
        const content = renderJourney([sectionWithField, bareTableSection], tpl);
        // The sibling section that does assert is still generated.
        expect(content).toContain('Check the GeneralInformation section of the Object Page');
        // The bare table section must be skipped entirely — no block, no section-tab press for it.
        expect(content).not.toContain('Check the BookingSupplement section of the Object Page');
        expect(content).not.toContain('iPressSectionIconTabFilterButton("BookingSupplement")');
    });

    test.each(buckets)('%s: never emits a section tab press without a following Then assertion', (_name, tpl) => {
        const content = renderJourney([sectionWithField, bareTableSection], tpl);
        // Scan every opaTest(...) body: any that presses a section tab must also run an assertion.
        const opaTestBlock = /opaTest\([^]*?\{([^]*?)\n {4,8}\}\);/g;
        let match: RegExpExecArray | null;
        let scanned = 0;
        while ((match = opaTestBlock.exec(content)) !== null) {
            const body = match[1];
            if (body.includes('iPressSectionIconTabFilterButton')) {
                scanned++;
                expect(body).toMatch(/\bThen\./);
            }
        }
        // Guard against the regex silently matching nothing: the asserting sibling presses its tab.
        expect(scanned).toBeGreaterThan(0);
    });
});
