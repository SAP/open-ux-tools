import { join } from 'path';
import { BuildingBlockType, PromptsAPI } from '../../../src';
import { ProjectProvider } from '../../../src/building-block/prompts/utils/project';

describe('Prompts', () => {
    const fs = jest.fn() as any;
    let promptsAPI: PromptsAPI;
    beforeAll(async () => {
        const projectPath = join(__dirname, '../sample/building-block/webapp-prompts');
        const projectProvider = await ProjectProvider.createProject(projectPath);
        jest.spyOn(ProjectProvider, 'createProject').mockResolvedValue(projectProvider);
        promptsAPI = await PromptsAPI.init(projectPath);
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
            expect(filesChoices.map((choice) => choice.name)).toMatchSnapshot();
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

        // test('Choices for field "aggregationPath"', async () => {
        //     const choices = await promptsAPI.getBuildingBlockChoices(BuildingBlockType.Chart, 'aggregationPath', {});
        //     expect(choices).toMatchSnapshot();
        // });
    });
});
