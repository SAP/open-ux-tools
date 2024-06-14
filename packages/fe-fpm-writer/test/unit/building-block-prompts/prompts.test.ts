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
});
