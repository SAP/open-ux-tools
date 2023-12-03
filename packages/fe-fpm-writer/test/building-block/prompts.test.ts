import { getChartBuildingBlockPrompts, getFilterBarBuildingBlockPrompts } from '../../src';
import ProjectProvider from '../../src/building-block/utils/project';

describe('Prompts', () => {
    const fs = jest.fn() as any;
    beforeAll(() => {
        jest.spyOn(ProjectProvider, 'createProject').mockResolvedValue({} as ProjectProvider);
    });
    test('getChartBuildingBlockPrompts', async () => {
        const questionnair = await getChartBuildingBlockPrompts('', fs);
        expect(questionnair.length).toBe(10);
    });

    test('generateChartBuildingBlock', async () => {
        const questionnair = await getFilterBarBuildingBlockPrompts('', fs);
        expect(questionnair.length).toBe(7);
    });
});
