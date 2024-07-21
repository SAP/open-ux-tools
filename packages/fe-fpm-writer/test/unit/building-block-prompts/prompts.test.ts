import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { PromptsType, PromptsAPI, BuildingBlockType } from '../../../src';
import type { TablePromptsAnswer, SupportedAnswers, BuildingBlockTypePromptsAnswer } from '../../../src';
import type { ChoiceOptions } from 'inquirer';

jest.setTimeout(10000);

describe('Prompts', () => {
    let fs: Editor;
    const projectPath = join(__dirname, '../sample/building-block/webapp-prompts');
    let promptsAPI: PromptsAPI;
    beforeEach(async () => {
        fs = create(createStorage());
        promptsAPI = await PromptsAPI.init(projectPath, undefined, fs);
    });

    test('Init PromptsApi without fs', async () => {
        const initPromptsApi = await PromptsAPI.init(projectPath);
        expect(initPromptsApi.context.fs).toBeDefined();
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

    test('get prompts for invalid propmts type', async () => {
        const questionnair = await promptsAPI.getPrompts('notValid' as PromptsType);
        expect(questionnair).toStrictEqual({ questions: [] });
    });

    describe('getChoices', () => {
        test('Choices for field "entitySet"', async () => {
            const choices = await promptsAPI.getChoices(PromptsType.Table, 'buildingBlockData.metaPath.entitySet', {});
            expect(choices).toMatchSnapshot();
        });

        test('Choices for field of static list type', async () => {
            const choices = await promptsAPI.getChoices(PromptsType.Table, 'buildingBlockData.type', {});
            expect(choices).toMatchSnapshot();
        });

        test('Choices for field of input type', async () => {
            const choices = await promptsAPI.getChoices(PromptsType.Table, 'buildingBlockData.id', {});
            expect(choices).toStrictEqual([]);
        });

        const types = [PromptsType.Chart, PromptsType.FilterBar, PromptsType.Table];
        test.each(types)('Type "%s", choices for field "qualifier"', async (type: PromptsType) => {
            const choices = await promptsAPI.getChoices(type, 'buildingBlockData.metaPath.qualifier', {
                buildingBlockData: {
                    metaPath: {
                        entitySet: 'C_CUSTOMER_OP_SRV.C_CustomerOPType'
                    }
                }
            });
            expect(choices).toMatchSnapshot();
        });

        test('Choices for field "viewOrFragmentPath" and "aggregationPath"', async () => {
            // Get "viewOrFragmentPath"
            const filesChoices = await promptsAPI.getChoices(PromptsType.Chart, 'viewOrFragmentPath', {});
            // Get "aggregationPath"
            const aggregationChoices = await promptsAPI.getChoices(PromptsType.Chart, 'aggregationPath', {
                viewOrFragmentPath:
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
            // Get "viewOrFragmentPath"
            const filesChoices = await promptsAPI.getChoices(PromptsType.Chart, 'viewOrFragmentPath', {});
            const fileChoice = filesChoices.find((choice) =>
                typeof choice === 'string'
                    ? choice.endsWith(filename)
                    : (choice as ChoiceOptions).value.endsWith(filename)
            );
            // Get "viewOrFragmentPath"
            const aggregationChoices = await promptsAPI.getChoices(PromptsType.Chart, 'buildingBlockData.filterBar', {
                viewOrFragmentPath: typeof fileChoice === 'string' ? fileChoice : (fileChoice as ChoiceOptions).value
            });
            expect(aggregationChoices).toMatchSnapshot();
        });

        test('Choices for field "filterBar", no xml file throws error', async () => {
            const choices = await promptsAPI.getChoices(PromptsType.Chart, 'buildingBlockData.filterBar', {
                viewOrFragmentPath: 'non-existent'
            });
            expect(choices).toEqual([]);
        });
    });

    describe('validateAnswers', () => {
        const types = [PromptsType.Chart, PromptsType.FilterBar, PromptsType.Table];
        test.each(types)('Type "%s", required fields validation', async (type: PromptsType) => {
            const result = await promptsAPI.validateAnswers(type, { id: '' });
            expect(result).toMatchSnapshot();
        });

        test('validate non-existing question', async () => {
            const result = await promptsAPI.validateAnswers(PromptsType.Chart, { type: '' }, [{ name: 'type' }]);
            expect(result).toStrictEqual({});
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
                    { viewOrFragmentPath: replativeFilePath, buildingBlockData: { id: value } },
                    [{ name: 'buildingBlockData.id' }]
                );
                expect(validation['buildingBlockData.id']).toEqual(result);
            });
        });
    });

    const types = [PromptsType.Table, PromptsType.Chart, PromptsType.FilterBar];
    const baseAnswers = {
        viewOrFragmentPath: join('webapp/ext/main/Main.view.xml'),
        aggregationPath: "/mvc:View/*[local-name()='Page']/*[local-name()='content']",
        buildingBlockData: {
            id: 'id',
            metaPath: {
                entitySet: 'test.entity',
                qualifier: 'qualifier'
            }
        }
    };
    const answers: { [key: string]: SupportedAnswers } = {
        [PromptsType.Table]: {
            ...baseAnswers,
            buildingBlockData: {
                ...baseAnswers.buildingBlockData,
                buildingBlockType: BuildingBlockType.Table,
                filterBar: 'filterBar',
                type: 'ResponsiveTable',
                headerVisible: true,
                header: 'header'
            }
        },
        [PromptsType.Chart]: {
            ...baseAnswers,
            buildingBlockData: {
                ...baseAnswers.buildingBlockData,
                buildingBlockType: BuildingBlockType.Chart,
                filterBar: 'filterBar',
                selectionMode: 'testSelectionMode',
                selectionChange: 'function1'
            }
        },
        [PromptsType.FilterBar]: {
            ...baseAnswers,
            buildingBlockData: {
                ...baseAnswers.buildingBlockData,
                buildingBlockType: BuildingBlockType.FilterBar,
                filterChanged: 'function1',
                search: 'function2'
            }
        }
    };
    describe('getCodeSnippet', () => {
        test.each(types)('Type "%s", get code snippet', async (type: PromptsType) => {
            const result = promptsAPI.getCodeSnippets(type, answers[type] as SupportedAnswers);
            expect(result.viewOrFragmentPath.content).toMatchSnapshot();
            expect(result.viewOrFragmentPath.filePathProps?.fileName).toBe('Main.view.xml');
        });

        test('get code snippet with placeholders', async () => {
            const result = promptsAPI.getCodeSnippets(PromptsType.Table, {
                buildingBlockData: {
                    buildingBlockType: BuildingBlockType.Table,
                    type: 'GridTable'
                }
            } as TablePromptsAnswer);
            expect(result.viewOrFragmentPath.content).toMatchSnapshot();
        });

        test('get code snippet withnot supported type', async () => {
            const result = promptsAPI.getCodeSnippets(PromptsType.BuildingBlocks, {
                buildingBlockData: {
                    buildingBlockType: PromptsType.BuildingBlocks
                }
            } as unknown as BuildingBlockTypePromptsAnswer);
            expect(result).toStrictEqual({});
        });
    });

    describe('submitAnswers', () => {
        test.each(types)('Type "%s"', async (type: PromptsType) => {
            const result = promptsAPI.submitAnswers(type, answers[type] as SupportedAnswers);
            expect(result.read(join(projectPath, baseAnswers.viewOrFragmentPath))).toMatchSnapshot();
        });

        test('Type generation prompts type without generator', async () => {
            const result = promptsAPI.submitAnswers(
                PromptsType.BuildingBlocks,
                {} as unknown as BuildingBlockTypePromptsAnswer
            );
            expect(result.read(join(projectPath, baseAnswers.viewOrFragmentPath))).toMatchSnapshot();
        });
    });
});
