import {
    getBuildingBlockTypePrompts,
    getChartBuildingBlockPrompts,
    getFilterBarBuildingBlockPrompts,
    getTableBuildingBlockPrompts
} from '../../../src';
import ProjectProvider from '../../../src/building-block/utils/project';

describe('Prompts', () => {
    const fs = jest.fn() as any;
    beforeAll(() => {
        jest.spyOn(ProjectProvider, 'createProject').mockResolvedValue({} as ProjectProvider);
    });
    test('getBuildingBlockTypePrompts', async () => {
        const questionnair = await getBuildingBlockTypePrompts();
        expect(questionnair).toMatchSnapshot();
    });

    test('getChartBuildingBlockPrompts', async () => {
        const questionnair = await getChartBuildingBlockPrompts('', fs);
        expect(questionnair).toMatchSnapshot();
    });

    test('getFilterBarBuildingBlockPrompts', async () => {
        const questionnair = await getFilterBarBuildingBlockPrompts('', fs);
        expect(questionnair).toMatchSnapshot();
    });

    test('getTableBuildingBlockPrompts', async () => {
        const questionnair = await getTableBuildingBlockPrompts('', fs);
        expect(questionnair).toMatchSnapshot();
    });
});
