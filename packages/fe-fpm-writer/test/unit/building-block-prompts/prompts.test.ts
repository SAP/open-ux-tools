import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { PromptsType, PromptsAPI, TablePromptsAnswer, BuildingBlockType, SupportedAnswers } from '../../../src';
import { ProjectProvider } from '../../../src/building-block/prompts/utils/project';
import { ChoiceOptions } from 'inquirer';

jest.setTimeout(10000);

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

    test('Init PromptsApi without fs', async () => {
        const initPromptsApi = await PromptsAPI.init(projectPath);
        expect(initPromptsApi.fs).toBeDefined();
    });

    test('getBuildingBlockTypePrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(PromptsType.BuildingBlocks);
        expect(questionnair).toMatchSnapshot();
    });

    test('getChartBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(PromptsType.Chart);
        expect(questionnair).toMatchSnapshot();
    });

    test('getFilterBarBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(PromptsType.FilterBar);
        expect(questionnair).toMatchSnapshot();
    });

    test('getTableBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getPrompts(PromptsType.Table);
        expect(questionnair).toMatchSnapshot();
    });

    describe('getChoices', () => {
        test('Choices for field "entity"', async () => {
            const choices = await promptsAPI.getChoices(PromptsType.Table, 'entity', {});
            expect(choices).toMatchSnapshot();
        });

        const types = [PromptsType.Chart, PromptsType.FilterBar, PromptsType.Table];
        test.each(types)('Type "%s", choices for field "qualifier"', async (type: PromptsType) => {
            const choices = await promptsAPI.getChoices(type, 'qualifier', {
                entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType'
            });
            expect(choices).toMatchSnapshot();
        });

        test('Choices for field "viewOrFragmentFile" and "aggregationPath"', async () => {
            // Get "viewOrFragmentFile"
            const filesChoices = await promptsAPI.getChoices(PromptsType.Chart, 'viewOrFragmentFile', {});
            // Get "viewOrFragmentFile"
            const aggregationChoices = await promptsAPI.getChoices(PromptsType.Chart, 'aggregationPath', {
                viewOrFragmentFile:
                    typeof filesChoices[0] === 'string' ? filesChoices[0] : (filesChoices[0] as ChoiceOptions).value
            });
            expect(aggregationChoices).toMatchSnapshot();
        });

        test('Choices for field "filterBar"', async () => {
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
            const filesChoices = await promptsAPI.getChoices(PromptsType.Chart, 'viewOrFragmentFile', {});
            const fileChoice = filesChoices.find((choice) =>
                typeof choice === 'string'
                    ? choice.endsWith(filename)
                    : (choice as ChoiceOptions).value.endsWith(filename)
            );
            // Get "viewOrFragmentFile"
            const aggregationChoices = await promptsAPI.getChoices(PromptsType.Chart, 'filterBar', {
                viewOrFragmentFile: typeof fileChoice === 'string' ? fileChoice : (fileChoice as ChoiceOptions).value
            });
            expect(aggregationChoices).toMatchSnapshot();
        });
    });

    describe('validateAnswers', () => {
        const types = [PromptsType.Chart, PromptsType.FilterBar, PromptsType.Table];
        test.each(types)('Type "%s", required fields validation', async (type: PromptsType) => {
            const result = await promptsAPI.validateAnswers(type, { id: '' });
            expect(result).toMatchSnapshot();
        });

        describe('validate function', () => {
            const testCases = [
                {
                    name: 'Validation function returns valid result',
                    value: 'Test',
                    result: { isValid: true }
                },
                {
                    name: 'Validation function returns inalid result',
                    value: 'FilterBar',
                    result: { isValid: false, errorMessage: 'An element with this ID already exists' }
                }
            ];
            test.each(testCases)('$name', async ({ value, result }) => {
                const filename = 'Test.view.xml';
                const replativeFilePath = join(`webapp/ext/${filename}`);
                const filePath = join(projectPath, replativeFilePath);
                const xml = `
                <mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
                    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
                    xmlns:macros="sap.fe.macros">
                    <Page title="Main">
                        <content>
                            <macros:FilterBar id="FilterBar" metaPath="@com.sap.vocabularies.UI.v1.SelectionFields"/>
                        </content>
                    </Page>
                </mvc:View>
                `;
                fs.write(filePath, xml);
                const validation = await promptsAPI.validateAnswers(
                    PromptsType.FilterBar,
                    { viewOrFragmentFile: replativeFilePath, id: value },
                    [{ name: 'id' }]
                );
                expect(validation['id']).toEqual(result);
            });
        });
    });

    const types = [PromptsType.Table, PromptsType.Chart, PromptsType.FilterBar];
    const baseAnswers = {
        viewOrFragmentFile: join('webapp/ext/main/Main.view.xml'),
        aggregationPath: "/mvc:View/*[local-name()='Page']/*[local-name()='content']",
        id: 'id',
        entity: 'test.entity',
        qualifier: 'qualifier'
    };
    const answers: { [key: string]: SupportedAnswers } = {
        [PromptsType.Table]: {
            ...baseAnswers,
            filterBar: 'filterBar',
            type: 'ResponsiveTable',
            headerVisible: true,
            header: 'header',
            buildingBlockType: BuildingBlockType.Table
        },
        [PromptsType.Chart]: {
            ...baseAnswers,
            filterBar: 'filterBar',
            selectionMode: 'testSelectionMode',
            selectionChange: true,
            buildingBlockType: BuildingBlockType.Chart
        },
        [PromptsType.FilterBar]: {
            ...baseAnswers,
            filterChanged: 'function1',
            search: 'function2',
            buildingBlockType: BuildingBlockType.FilterBar
        }
    };
    describe('getCodeSnippet', () => {
        test.each(types)('Type "%s", get code snippet', async (type: PromptsType) => {
            const result = promptsAPI.getCodeSnippet(type, answers[type] as SupportedAnswers);
            expect(result).toMatchSnapshot();
        });

        test('get code snippet with placeholders', async () => {
            const result = promptsAPI.getCodeSnippet(PromptsType.Table, {} as TablePromptsAnswer);
            expect(result).toMatchSnapshot();
        });
    });

    describe('submitAnswers', () => {
        test.each(types)('Type "%s"', async (type: PromptsType) => {
            const result = promptsAPI.submitAnswers(type, answers[type] as SupportedAnswers);
            expect(result.read(join(projectPath, baseAnswers.viewOrFragmentFile))).toMatchSnapshot();
        });
    });
});
