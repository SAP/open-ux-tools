import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { BuildingBlockType, PromptsAPI } from '../../../src';
import { ProjectProvider } from '../../../src/building-block/prompts/utils/project';

describe('Prompts', () => {
    let fs: Editor;
    const projectPath = join(__dirname, '../sample/building-block/webapp-prompts');
    let promptsAPI: PromptsAPI;
    beforeEach(async () => {
        fs = create(createStorage());
        // fs.delete(projectPath);
        const projectProvider = await ProjectProvider.createProject(projectPath);
        jest.spyOn(ProjectProvider, 'createProject').mockResolvedValue(projectProvider);
        promptsAPI = await PromptsAPI.init(projectPath, fs);
    });

    test('getBuildingBlockTypePrompts', async () => {
        const questionnair = await promptsAPI.getBuildingBlockTypePrompts();
        expect(questionnair).toMatchSnapshot();
    });

    test('getChartBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(BuildingBlockType.Chart, fs);
        expect(questionnair).toMatchSnapshot();
    });

    test('getFilterBarBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(BuildingBlockType.FilterBar, fs);
        expect(questionnair).toMatchSnapshot();
    });

    test('getTableBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(BuildingBlockType.Table, fs);
        expect(questionnair).toMatchSnapshot();
    });

    describe('getBuildingBlockChoices', () => {
        test('Choices for field "entity"', async () => {
            const choices = await promptsAPI.getBuildingBlockChoices(BuildingBlockType.Table, 'entity', {});
            expect(choices).toMatchSnapshot();
        });

        const types = [BuildingBlockType.Chart, BuildingBlockType.FilterBar, BuildingBlockType.Table];
        test.each(types)('Type "%s", choices for field "qualifier"', async (type: BuildingBlockType) => {
            const choices = await promptsAPI.getBuildingBlockChoices(type, 'qualifier', {
                entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType'
            });
            expect(choices).toMatchSnapshot();
        });

        test('Choices for field "viewOrFragmentFile" and "aggregationPath"', async () => {
            // Get "viewOrFragmentFile"
            const filesChoices = await promptsAPI.getBuildingBlockChoices(
                BuildingBlockType.Chart,
                'viewOrFragmentFile',
                {}
            );
            // Get "viewOrFragmentFile"
            const aggregationChoices = await promptsAPI.getBuildingBlockChoices(
                BuildingBlockType.Chart,
                'aggregationPath',
                {
                    viewOrFragmentFile: filesChoices[0].value
                }
            );
            expect(aggregationChoices).toMatchSnapshot();
        });

        test('Choices for field "filterBarId"', async () => {
            const filename = 'Test.view.xml';
            const xml = `
<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content>
            <macros:FilterBar id="FilterBar" metaPath="@com.sap.vocabularies.UI.v1.SelectionFields"/>
            <macros:FilterBar id="FilterBar2" />
            <macros:FilterBar id="dummyId" />
        </content>
    </Page>
</mvc:View>
            `;
            fs.write(join(projectPath, `webapp/ext/${filename}`), xml);

            // ToDo write xml with filterbars
            // Get "viewOrFragmentFile"
            const filesChoices = await promptsAPI.getBuildingBlockChoices(
                BuildingBlockType.Chart,
                'viewOrFragmentFile',
                {}
            );
            const fileChoice = filesChoices.find((choice) => choice.value.endsWith(filename));
            // Get "viewOrFragmentFile"
            const aggregationChoices = await promptsAPI.getBuildingBlockChoices(
                BuildingBlockType.Chart,
                'filterBarId',
                {
                    viewOrFragmentFile: fileChoice?.value
                }
            );
            expect(aggregationChoices).toMatchSnapshot();
        });
    });
});
