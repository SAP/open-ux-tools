import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'node:path';
import {
    isElementIdAvailable,
    getOrAddNamespace,
    selectTargetNodes
} from '../../../../../src/building-block/prompts/utils/xml';
import { DOMParser } from '@xmldom/xmldom';

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
                name: 'Invalid xml(warning)',
                content: '<a>aaa</b>',
                id: 'Test',
                available: true
            },
            {
                name: 'Invalid xml(warning), but duplicate id',
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
    });
});

describe('getOrAddNamespace', () => {
    function createFragmentXmlDoc(attrs: Record<string, string> = {}) {
        const attrString = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
        const xml = `<core:FragmentDefinition ${attrString}></core:FragmentDefinition>`;
        return new DOMParser().parseFromString(xml, 'application/xml');
    }

    function createViewXmlDoc(attrs: Record<string, string> = {}) {
        const attrString = Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');
        const xml = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m" ${attrString}></mvc:View>`;
        return new DOMParser().parseFromString(xml, 'application/xml');
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
        const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
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
        const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
        expect(getOrAddNamespace(xmlDoc, 'sap.fe.macros', 'macros')).toBe('');
        expect(xmlDoc.documentElement.getAttribute('xmlns')).toBe('sap.fe.macros');
    });

    test('selectTargetNodes works correctly for CustomColumn', async () => {
        const document = new DOMParser()
            .parseFromString(`<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros" xmlns:macrosTable="sap.fe.macros.table">
        <VBox>
            <Text text="Customsec"/>
            <macros:Table id="Table" metaPath="_Booking/@com.sap.vocabularies.UI.v1.LineItem#tableMacro">
            </macros:Table>
        </VBox>
    </core:FragmentDefinition>`);
        const aggregationPath = `/core:FragmentDefinition/VBox[1]/*[2]`;
        const targetNodes = selectTargetNodes(aggregationPath, document);
        expect(targetNodes.length).toBe(1);
        expect(targetNodes[0].nodeName).toBe('macros:Table');
    });
});
