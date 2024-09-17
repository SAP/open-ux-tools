import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { isElementIdAvailable } from '../../../../../src/building-block/prompts/utils/xml';

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
