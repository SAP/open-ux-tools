import { join } from 'path';
import { PromptsAPI } from '../../../src';
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
        const questionnair = await promptsAPI.getChartBuildingBlockPrompts(fs);
        expect(questionnair).toMatchSnapshot();
    });

    test('getFilterBarBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getFilterBarBuildingBlockPrompts(fs);
        expect(questionnair).toMatchSnapshot();
    });

    test('getTableBuildingBlockPrompts', async () => {
        const questionnair = await promptsAPI.getTableBuildingBlockPrompts(fs);
        expect(questionnair).toMatchSnapshot();
    });
});
