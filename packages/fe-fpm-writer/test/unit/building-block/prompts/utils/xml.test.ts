import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { isElementIdAvailable, getOrAddMacrosNamespace } from '../../../../../src/building-block/prompts/utils/xml';
import { DOMParser } from '@xmldom/xmldom';
import { BuildingBlockType } from '../../../../../src/building-block/types';

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

describe('getOrAddMacrosNamespace', () => {
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
        expect(getOrAddMacrosNamespace(xmlDoc, BuildingBlockType.Page)).toBe('macros');
    });

    it('returns existing prefix for richtexteditor namespace in FragmentDefinition', () => {
        const xmlDoc = createFragmentXmlDoc({ 'xmlns:rte': 'sap.fe.macros.richtexteditor' });
        expect(getOrAddMacrosNamespace(xmlDoc, BuildingBlockType.RichTextEditor)).toBe('rte');
    });

    it('adds macros namespace if missing and returns default prefix in mvc:View', () => {
        const xmlDoc = createViewXmlDoc();
        expect(getOrAddMacrosNamespace(xmlDoc, BuildingBlockType.Page)).toBe('macros');
        expect(xmlDoc.documentElement.getAttribute('xmlns:macros')).toBe('sap.fe.macros');
    });

    it('adds richtexteditor namespace if missing and returns default prefix in FragmentDefinition', () => {
        const xmlDoc = createFragmentXmlDoc();
        expect(getOrAddMacrosNamespace(xmlDoc, BuildingBlockType.RichTextEditor)).toBe('richtexteditor');
        expect(xmlDoc.documentElement.getAttribute('xmlns:richtexteditor')).toBe('sap.fe.macros.richtexteditor');
    });

    it('does not add duplicate namespace if already present in mvc:View and FragmentDefinition', () => {
        const xmlDocView = createViewXmlDoc({
            'xmlns:macros': 'sap.fe.macros',
            'xmlns:richtexteditor': 'sap.fe.macros.richtexteditor'
        });
        expect(getOrAddMacrosNamespace(xmlDocView, BuildingBlockType.Page)).toBe('macros');
        expect(getOrAddMacrosNamespace(xmlDocView, BuildingBlockType.RichTextEditor)).toBe('richtexteditor');
        expect(xmlDocView.documentElement.attributes.length).toBeGreaterThanOrEqual(2);

        const xmlDocFragment = createFragmentXmlDoc({
            'xmlns:macros': 'sap.fe.macros',
            'xmlns:richtexteditor': 'sap.fe.macros.richtexteditor'
        });
        expect(getOrAddMacrosNamespace(xmlDocFragment, BuildingBlockType.Page)).toBe('macros');
        expect(getOrAddMacrosNamespace(xmlDocFragment, BuildingBlockType.RichTextEditor)).toBe('richtexteditor');
        expect(xmlDocFragment.documentElement.attributes.length).toBe(2);
    });
});
