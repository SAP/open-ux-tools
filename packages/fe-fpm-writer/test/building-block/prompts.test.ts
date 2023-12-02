import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getChartBuildingBlockPrompts } from '../../src';

describe('Prompts', () => {
    test('getChartBuildingBlockPrompts', async () => {
        const fs = create(createStorage());
        const questionnair = await getChartBuildingBlockPrompts('', fs);
        expect(questionnair.length).toBeGreaterThan(0);
    });

    test('generateChartBuildingBlock', () => {
        // generateChartBuildingBlock();
    });
});
