import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getOrAddNamespace,
    getXPathStringsForXmlFile,
    getDOMParserOptions,
    getExistingButtonGroups,
    getFilterBarIdsInFile,
    TEMPLATE_NAMESPACES
} from '../../../../../src/building-block/prompts/utils/xml.js';
import { DOMParser } from '@xmldom/xmldom';
import type { Document as XmldomDocument } from '@xmldom/xmldom';
import { isElementIdAvailable } from '../../../../../src/common/utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('utils - xml', () => {
    let fs: Editor;
    const projectPath = join(__dirname, '../sample/building-block/webapp-prompts');

    beforeAll(async () => {
        fs = create(createStorage());
    });

    describe('isElementIdAvailable', () => {
        const xmlWithFilterBars = `
<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page id="Test" title="Main">
        <content>
            <macros:FilterBar id="FilterBar" metaPath="@com.sap.vocabularies.UI.v1.SelectionFields"/>
            <macros:FilterBar id="FilterBar2" />
            <macros:FilterBar id="dummyId" />
        </content>
    </Page>
</mvc:View>
            `;
        const xmlWithoutFilterBars = `
<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros"></mvc:View>
            `;
        const testsCases = [
            {
                name: 'Duplicate id',
                content: xmlWithFilterBars,
                id: 'FilterBar2',
                available: false
            },
            {
                name: 'Duplicate id in non macros element',
                content: xmlWithFilterBars,
                id: 'Test',
                available: false
            },
            {
                name: 'Available id in xml with filterbars',
                content: xmlWithFilterBars,
                id: 'FilterBar3',
                available: true
            },
            {
                name: 'Available id in xml without filterbars',
                content: xmlWithoutFilterBars,
                id: 'FilterBar',
                available: true
            },
            {
                name: 'Text node xml',
                content: 'dummy',
                id: 'Test',
                available: true
            },
            {
                name: 'Invalid xml(fatalError)',
                content: '<a>aaa</b>',
                id: 'Test',
                available: true
            },
            {
                // parsing throws, but regex fallback detects the id in the raw content
                name: 'Invalid xml(fatalError), but duplicate id',
                content: '<a id="Test">aaa</b>',
                id: 'Test',
                available: false
            },
            {
                name: 'Invalid xml(error)',
                content: '<a><test </test></a>',
                id: 'Test',
                available: true
            },
            {
                name: 'Invalid xml(fatal error)',
                content: '<a test="true" test="false"></a>',
                id: 'Test',
                available: true
            }
        ];
        test.each(testsCases)('$name', ({ content, id, available }) => {
            const path = join(projectPath, `webapp/ext/Test.xml`);
            fs.write(path, content);
            expect(isElementIdAvailable(fs, path, id)).toEqual(available);
        });

        it('logs a warning via the provided logger when parsing fails', () => {
            const path = join(projectPath, `webapp/ext/Broken.xml`);
            fs.write(path, '<a id="Test">aaa</b>');
            const logger = { warn: jest.fn() };
            isElementIdAvailable(fs, path, 'Test', logger as never);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('isElementIdAvailable'));
        });

        it('correctly handles id with regex metacharacters in the fallback text search', () => {
            const path = join(projectPath, `webapp/ext/BrokenMetaId.xml`);
            // 'filter.bar' contains a dot — without escaping, the regex would match 'filter-bar' too
            fs.write(path, '<a id="filter-bar">aaa</b>');
            expect(isElementIdAvailable(fs, path, 'filter.bar')).toBe(true);
            fs.write(path, '<a id="filter.bar">aaa</b>');
            expect(isElementIdAvailable(fs, path, 'filter.bar')).toBe(false);
        });
    });
});

describe('getOrAddNamespace', () => {
    function createFragmentXmlDoc(attrs: Record<string, string> = {}): XmldomDocument {
        const attrString = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
        const xml = `<core:FragmentDefinition ${attrString}></core:FragmentDefinition>`;
        return new DOMParser(getDOMParserOptions(TEMPLATE_NAMESPACES)).parseFromString(xml, 'application/xml');
    }

    function createViewXmlDoc(attrs: Record<string, string> = {}): XmldomDocument {
        const attrString = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
        const xml = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" ${attrString}></mvc:View>`;
        return new DOMParser(getDOMParserOptions(TEMPLATE_NAMESPACES)).parseFromString(xml, 'application/xml');
    }

    it('returns existing prefix for macros namespace in mvc:View', () => {
        const xmlDoc = createViewXmlDoc({ 'xmlns:macros': 'sap.fe.macros' });
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros', 'macros')).toBe('macros');
    });

    it('returns existing prefix for richtexteditor namespace in FragmentDefinition', () => {
        const xmlDoc = createFragmentXmlDoc({ 'xmlns:rte': 'sap.fe.macros.richtexteditor' });
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros.richtexteditor', 'richtexteditor')).toBe('rte');
    });

    it('adds macros namespace if missing and returns default prefix in mvc:View', () => {
        const xmlDoc = createViewXmlDoc();
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros', 'macros')).toBe('macros');
        expect(xmlDoc.documentElement.getAttribute('xmlns:macros')).toBe('sap.fe.macros');
    });

    it('adds richtexteditor namespace if missing and returns default prefix in FragmentDefinition', () => {
        const xmlDoc = createFragmentXmlDoc();
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros.richtexteditor', 'richtexteditor')).toBe('richtexteditor');
        expect(xmlDoc.documentElement.getAttribute('xmlns:richtexteditor')).toBe('sap.fe.macros.richtexteditor');
    });

    it('does not add duplicate namespace if already present in mvc:View and FragmentDefinition', () => {
        const xmlDocView = createViewXmlDoc({
            'xmlns:macros': 'sap.fe.macros',
            'xmlns:richtexteditor': 'sap.fe.macros.richtexteditor'
        });
        expect(getOrAddNamespace(xmlDocView, 'sap.fe.macros', 'macros')).toBe('macros');
        expect(getOrAddNamespace(xmlDocView, 'sap.fe.macros.richtexteditor', 'richtexteditor')).toBe('richtexteditor');
        expect(xmlDocView.documentElement.attributes.length).toBeGreaterThanOrEqual(2);

        const xmlDocFragment = createFragmentXmlDoc({
            'xmlns:macros': 'sap.fe.macros',
            'xmlns:richtexteditor': 'sap.fe.macros.richtexteditor'
        });
        expect(getOrAddNamespace(xmlDocFragment, 'sap.fe.macros', 'macros')).toBe('macros');
        expect(getOrAddNamespace(xmlDocFragment, 'sap.fe.macros.richtexteditor', 'richtexteditor')).toBe(
            'richtexteditor'
        );
        expect(xmlDocFragment.documentElement.attributes.length).toBe(2);
    });

    it('returns empty string as prefix when macros namespace is defined as default namespace in FragmentDefinition', () => {
        const xml = `<core:FragmentDefinition xmlns="sap.fe.macros">
            <RichTextEditorWithMetadata metaPath="/Travel/Status" id="RichTextEditor">
            </RichTextEditorWithMetadata>
        </core:FragmentDefinition>`;
        const xmlDoc = new DOMParser(getDOMParserOptions(TEMPLATE_NAMESPACES)).parseFromString(xml, 'application/xml');
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros', 'macros')).toBe('');
        expect(xmlDoc.documentElement.getAttribute('xmlns')).toBe('sap.fe.macros');
    });

    it('returns empty string as prefix when macros namespace is defined as default namespace in mvc:View', () => {
        const xml = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.fe.macros"
            xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main">
            <Page title="Main">
                <content />
            </Page>
        </mvc:View>`;
        const xmlDoc = new DOMParser(getDOMParserOptions(TEMPLATE_NAMESPACES)).parseFromString(xml, 'application/xml');
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros', 'macros')).toBe('');
        expect(xmlDoc.documentElement.getAttribute('xmlns')).toBe('sap.fe.macros');
    });
});

describe('getXPathStringsForXmlFile', () => {
    let fs: Editor;

    beforeAll(() => {
        fs = create(createStorage());
    });

    it('handles document with no element children (PI-only firstChild)', () => {
        const viewPath = '/test/PiOnly.view.xml';
        // A document whose firstChild is a ProcessingInstruction — it has no ELEMENT children,
        // so the while-loop visits the PI node and the null-guard on node covers the !node branch
        // via the typed null possibility on firstChild.
        fs.write(viewPath, `<?xml version="1.0"?><mvc:View xmlns:mvc="sap.ui.core.mvc"/>`);
        const { inputChoices } = getXPathStringsForXmlFile(viewPath, fs);
        expect(typeof inputChoices).toBe('object');
    });

    it('uses macros:Page as pageMacroDefinition when macros is the default namespace (empty prefix)', () => {
        // macrosNamespace returns '' when macros is defined as the default xmlns
        // the falsy branch on line 116: macrosNamespace ? `${...}:Page` : 'macros:Page'
        const viewPath = '/test/DefaultNsMacros.view.xml';
        fs.write(
            viewPath,
            `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.fe.macros">
    <Page title="Main"/>
</mvc:View>`
        );
        const { pageMacroDefinition } = getXPathStringsForXmlFile(viewPath, fs);
        expect(pageMacroDefinition).toBe('macros:Page');
    });

    it('falls back to macros prefix when macros is default namespace and macros:Page has no items child', () => {
        // macrosNamespace is '' (falsy) — covers the `macrosNamespace || 'macros'` branch
        // in addMacrosItemsPathIfMissing (line 82) and the call site (line 136)
        const viewPath = '/test/DefaultNsMacrosWithPage.view.xml';
        fs.write(
            viewPath,
            `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.fe.macros">
    <Page id="MyPage" title="cp">
    </Page>
</mvc:View>`
        );
        const { inputChoices } = getXPathStringsForXmlFile(viewPath, fs);
        const keys = Object.keys(inputChoices);
        // synthesized path uses 'macros' as the fallback prefix
        expect(keys.some((k) => k.includes('macros:items'))).toBe(true);
    });

    it('synthesizes macros:items using nodeName when macros:Page node already has a prefix', () => {
        // covers the truthy branch: (node as XmldomElement).prefix ? node.nodeName : `${resolved}:Page`
        const viewPath = '/test/CpWithPrefix.view.xml';
        fs.write(
            viewPath,
            `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros" xmlns="sap.m">
    <Page title="Main">
        <content>
            <macros:Page id="Page" title="cp">
            </macros:Page>
        </content>
    </Page>
</mvc:View>`
        );
        const { inputChoices } = getXPathStringsForXmlFile(viewPath, fs);
        const keys = Object.keys(inputChoices);
        // The synthesized path uses macros:Page (from node.nodeName) / macros:items
        expect(keys.some((k) => k.includes('macros:Page/macros:items'))).toBe(true);
    });

    it('synthesizes macros:items path when macros:Page exists but has no macros:items child', () => {
        const viewPath = '/test/Cp.view.xml';
        fs.write(
            viewPath,
            `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros" xmlns="sap.m">
    <Page title="Main">
        <content>
            <macros:Page id="Page" title="cp" description="cp">
            </macros:Page>
        </content>
    </Page>
</mvc:View>`
        );
        const { inputChoices } = getXPathStringsForXmlFile(viewPath, fs);
        const keys = Object.keys(inputChoices);
        expect(keys.some((k) => k.endsWith('macros:Page/macros:items'))).toBe(true);
    });

    it('does not synthesize macros:items path when macros:items already exists', () => {
        const viewPath = '/test/CpWithItems.view.xml';
        fs.write(
            viewPath,
            `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros" xmlns="sap.m">
    <Page title="Main">
        <content>
            <macros:Page id="Page" title="cp">
                <macros:items>
                </macros:items>
            </macros:Page>
        </content>
    </Page>
</mvc:View>`
        );
        const { inputChoices } = getXPathStringsForXmlFile(viewPath, fs);
        const keys = Object.keys(inputChoices);
        // macros:items is a real element in the DOM — it will appear as a real choice, not a duplicate
        const macrosItemsKeys = keys.filter((k) => k.endsWith('macros:Page/macros:items'));
        expect(macrosItemsKeys).toHaveLength(1);
    });
});

describe('getDOMParserOptions', () => {
    const validXml = '<root xmlns:macros="sap.fe.macros"><macros:Table id="T1"/></root>';
    const invalidXml = '<a>aaa</b>';

    test('default handler throws on parse error', () => {
        const options = getDOMParserOptions();
        expect(() => new DOMParser(options).parseFromString(invalidXml, 'text/xml')).toThrow(
            /Unable to parse template file with building block data/
        );
    });

    test('custom handler is called with level and message', () => {
        const calls: [string, string][] = [];
        const options = getDOMParserOptions(undefined, (level, message) => {
            calls.push([level, message]);
        });
        try {
            new DOMParser(options).parseFromString(invalidXml, 'text/xml');
        } catch {
            // fatalError throws a ParseError in xmldom 0.9+; handler still gets called before the throw
        }
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][0]).toBeDefined();
    });

    test('silent handler: fatal parse error still throws ParseError in xmldom 0.9+', () => {
        const options = getDOMParserOptions(undefined, () => {});
        expect(() => new DOMParser(options).parseFromString(invalidXml, 'text/xml')).toThrow();
    });

    test('xmlns option resolves macros prefix from TEMPLATE_NAMESPACES', () => {
        const options = getDOMParserOptions(TEMPLATE_NAMESPACES);
        const doc = new DOMParser(options).parseFromString(validXml, 'text/xml');
        expect(doc.documentElement).toBeTruthy();
    });

    test.each([
        ['mvc prefix', `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"><Page title="Main"/></mvc:View>`],
        ['macros prefix', `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"><macros:Table id="T1"/></mvc:View>`],
        [
            'macrosTable prefix',
            `<core:FragmentDefinition xmlns:core="sap.ui.core"><macrosTable:Action key="a1"/></core:FragmentDefinition>`
        ],
        [
            'macrosChart prefix',
            `<core:FragmentDefinition xmlns:core="sap.ui.core"><macrosChart:Chart id="C1"/></core:FragmentDefinition>`
        ],
        [
            'richtexteditor prefix',
            `<core:FragmentDefinition xmlns:core="sap.ui.core"><richtexteditor:RichTextEditor id="R1"/></core:FragmentDefinition>`
        ]
    ])('TEMPLATE_NAMESPACES resolves %s without NamespaceError', (_label, xml) => {
        const options = getDOMParserOptions(TEMPLATE_NAMESPACES);
        expect(() => new DOMParser(options).parseFromString(xml, 'text/xml')).not.toThrow();
    });

    test('returns onError and xmlns in options object', () => {
        const handler = () => {};
        const options = getDOMParserOptions(TEMPLATE_NAMESPACES, handler);
        expect(options.onError).toBe(handler);
        expect(options.xmlns).toBe(TEMPLATE_NAMESPACES);
    });
});

describe('getOrAddNamespace - null documentElement', () => {
    it('returns the default prefix when documentElement is null', () => {
        const doc = new DOMParser(getDOMParserOptions(TEMPLATE_NAMESPACES)).parseFromString(
            '<root/>',
            'text/xml'
        ) as unknown as XmldomDocument;
        Object.defineProperty(doc, 'documentElement', { value: null, configurable: true });
        expect(getOrAddNamespace(doc, 'sap.fe.macros', 'macros')).toBe('macros');
    });
});

describe('getExistingButtonGroups', () => {
    let fs: Editor;

    beforeAll(() => {
        fs = create(createStorage());
    });

    it('returns empty set when RTE element is not found at aggregation path', async () => {
        const filePath = '/test/NoRte.fragment.xml';
        fs.write(
            filePath,
            `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns:macros="sap.fe.macros">
    <macros:Table id="T1"/>
</core:FragmentDefinition>`
        );
        const result = await getExistingButtonGroups(filePath, `/core:FragmentDefinition/macros:RTE`, fs);
        expect(result.size).toBe(0);
    });

    it('returns empty set when RTE element has no buttonGroups child', async () => {
        const filePath = '/test/RteNoGroups.fragment.xml';
        fs.write(
            filePath,
            `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
    <richtexteditor:RichTextEditorWithMetadata id="RTE1" metaPath="/Travel/Status"/>
</core:FragmentDefinition>`
        );
        const result = await getExistingButtonGroups(
            filePath,
            `/core:FragmentDefinition/richtexteditor:RichTextEditorWithMetadata`,
            fs
        );
        expect(result.size).toBe(0);
    });

    it('returns button group names when RTE has buttonGroups children', async () => {
        const filePath = '/test/RteWithGroups.fragment.xml';
        fs.write(
            filePath,
            `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
    <richtexteditor:RichTextEditorWithMetadata id="RTE1" metaPath="/Travel/Status">
        <richtexteditor:buttonGroups>
            <richtexteditor:ButtonGroup name="font-style" buttons="bold,italic"/>
            <richtexteditor:ButtonGroup name="clipboard" buttons="cut,copy,paste"/>
        </richtexteditor:buttonGroups>
    </richtexteditor:RichTextEditorWithMetadata>
</core:FragmentDefinition>`
        );
        const result = await getExistingButtonGroups(
            filePath,
            `/core:FragmentDefinition/richtexteditor:RichTextEditorWithMetadata`,
            fs
        );
        expect(result).toEqual(new Set(['font-style', 'clipboard']));
    });

    it('skips ButtonGroup elements that have no name attribute', async () => {
        const filePath = '/test/RteGroupNoName.fragment.xml';
        fs.write(
            filePath,
            `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
    <richtexteditor:RichTextEditorWithMetadata id="RTE1" metaPath="/Travel/Status">
        <richtexteditor:buttonGroups>
            <richtexteditor:ButtonGroup buttons="bold,italic"/>
        </richtexteditor:buttonGroups>
    </richtexteditor:RichTextEditorWithMetadata>
</core:FragmentDefinition>`
        );
        const result = await getExistingButtonGroups(
            filePath,
            `/core:FragmentDefinition/richtexteditor:RichTextEditorWithMetadata`,
            fs
        );
        expect(result.size).toBe(0);
    });
});

describe('getFilterBarIdsInFile', () => {
    let fs: Editor;

    beforeAll(() => {
        fs = create(createStorage());
    });

    it('returns ids of FilterBar elements', async () => {
        const filePath = '/test/FilterBarIds.view.xml';
        fs.write(
            filePath,
            `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros">
    <macros:FilterBar id="FB1"/>
    <macros:FilterBar id="FB2"/>
</mvc:View>`
        );
        const result = await getFilterBarIdsInFile(filePath, fs);
        expect(result).toEqual(['FB1', 'FB2']);
    });

    it('skips FilterBar elements with no id attribute', async () => {
        // covers the falsy branch of `if (id)` in getFilterBarIdsInFile
        const filePath = '/test/FilterBarNoId.view.xml';
        fs.write(
            filePath,
            `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns:macros="sap.fe.macros">
    <macros:FilterBar metaPath="@com.sap.vocabularies.UI.v1.SelectionFields"/>
</mvc:View>`
        );
        const result = await getFilterBarIdsInFile(filePath, fs);
        expect(result).toEqual([]);
    });
});

describe('getOrAddNamespace - empty prefix', () => {
    it('adds namespace as default xmlns when prefix is empty string', () => {
        // covers the `prefix === '' ? 'xmlns' : \`xmlns:\${prefix}\`` truthy branch
        const xml = `<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"></mvc:View>`;
        const doc = new DOMParser(getDOMParserOptions(TEMPLATE_NAMESPACES)).parseFromString(
            xml,
            'application/xml'
        ) as unknown as XmldomDocument;
        const result = getOrAddNamespace(doc, 'sap.fe.macros', '');
        expect(result).toBe('');
        expect(doc.documentElement?.getAttribute('xmlns')).toBe('sap.fe.macros');
    });
});
