import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getChartBuildingBlockPrompts } from '../../dist';

describe('Prompts', () => {
    test('getChartBuildingBlockPrompts', async () => {
        const fs = create(createStorage());
        const questionnair = await getChartBuildingBlockPrompts('', fs);
        expect(questionnair.length).toBe(9);
    });

    test('generateChartBuildingBlock', () => {
        // generateChartBuildingBlock();
    });
});
