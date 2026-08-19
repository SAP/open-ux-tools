import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../../templates/v4/latest/integration/ObjectPageJourney.js');

function makeSubSection(id: string, property: string) {
    return { id, fields: [{ property }], contactCardFields: [], contactCardColumns: [], tableColumns: {} };
}

function renderJourney(bodySections: unknown[]): string {
    const fs = create(createStorage());
    const out = join(__dirname, 'out.gen.js');
    fs.copyTpl(templatePath, out, {
        name: 'GLLineItem',
        navigationParents: { parentLRName: '', parentLRTableIdentifier: undefined, parentOPs: [] },
        hideFilterBar: false,
        headerActions: [],
        headerSections: [],
        editButton: undefined,
        headerTitle: undefined,
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
        expect(content).toContain('iCheckSubSection({ section: "S1" })');
        expect(content).toContain('iCheckSubSection({ section: "S2" })');
    });
});
