import { BuildingBlockType, PromptsAPI } from '@sap-ux/fe-fpm-writer';
import type { FilterBarPromptsAnswer, ChartPromptsAnswer, BuildingBlockTypePromptsAnswer } from '@sap-ux/fe-fpm-writer';
import type { TablePromptsAnswer } from '@sap-ux/fe-fpm-writer/src/building-block/prompts';
import inquirer from 'inquirer';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { promisify } from 'util';

const sampleAppPath = join(__dirname, '../sample/fe-app');
const testAppPath = join(__dirname, '../test-output/fe-app', `${Date.now()}`);

/**
 * Initializes the memfs and copies over the sample Fiori elements application.
 *
 * @returns {Promise<Editor>} the memfs editor object
 */
async function initialize(): Promise<Editor> {
    const fs = create(createStorage());

    fs.copy([join(sampleAppPath)], join(testAppPath));

    await promisify(fs.commit).call(fs);
    return fs;
}

/**
 * Generates a filter bar building block by prompting the user for the required information.
 *
 * @param {Editor} fs the memfs editor object
 * @returns {Promise<Editor>} the updated memfs editor object
 */
export async function generateFilterBarBuildingBlock(fs: Editor): Promise<Editor> {
    const basePath = testAppPath;
    const promptsAPI = await PromptsAPI.init(basePath);
    const answers: FilterBarPromptsAnswer = (await inquirer.prompt(
        (
            await promptsAPI.getPrompts(BuildingBlockType.FilterBar, fs)
        ).questions
    )) as FilterBarPromptsAnswer;
    fs = promptsAPI.submitAnswers<FilterBarPromptsAnswer>(BuildingBlockType.FilterBar, answers);
    return fs;
}

/**
 * Generates a chart building block by prompting the user for the required information.
 *
 * @param {Editor} fs the memfs editor object
 * @returns {Promise<Editor>} the updated memfs editor object
 */
export async function generateChartBuildingBlock(fs: Editor): Promise<Editor> {
    const basePath = testAppPath;
    const promptsAPI = await PromptsAPI.init(basePath);
    const answers: ChartPromptsAnswer = (await inquirer.prompt(
        (
            await promptsAPI.getPrompts(BuildingBlockType.Chart, fs)
        ).questions
    )) as ChartPromptsAnswer;
    fs = promptsAPI.submitAnswers<ChartPromptsAnswer>(BuildingBlockType.Chart, answers);
    return fs;
}
/**
 * Generates a table building block by prompting the user for the required information.
 *
 * @param {Editor} fs the memfs editor object
 * @returns {Promise<Editor>} the updated memfs editor object
 */
export async function generateTableBuildingBlock(fs: Editor): Promise<Editor> {
    const basePath = testAppPath;
    const promptsAPI = await PromptsAPI.init(basePath);
    const answers: TablePromptsAnswer = (await inquirer.prompt(
        (
            await promptsAPI.getPrompts(BuildingBlockType.Table, fs)
        ).questions
    )) as TablePromptsAnswer;
    fs = promptsAPI.submitAnswers<TablePromptsAnswer>(BuildingBlockType.Table, answers);
    return fs;
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        const promptsAPI = await PromptsAPI.init(sampleAppPath);
        let fs = await initialize();
        const answers: BuildingBlockTypePromptsAnswer = await inquirer.prompt(
            await promptsAPI.getBuildingBlockTypePrompts()
        );

        switch (answers.buildingBlockType) {
            case BuildingBlockType.Chart:
                fs = await generateChartBuildingBlock(fs);
                break;
            case BuildingBlockType.FilterBar:
                fs = await generateFilterBarBuildingBlock(fs);
                break;
            case BuildingBlockType.Table:
                fs = await generateTableBuildingBlock(fs);
                break;
            default:
                break;
        }
        await promisify(fs.commit).call(fs);
    } catch (error) {
        console.error(error.message);
    }
})();
