import { PromptsType, PromptsAPI } from '@sap-ux/fe-fpm-writer';
import type {
    FilterBarPromptsAnswer,
    ChartPromptsAnswer,
    TablePromptsAnswer,
    BuildingBlockTypePromptsAnswer
} from '@sap-ux/fe-fpm-writer';
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
    const promptsAPI = await PromptsAPI.init(basePath, undefined, fs);
    const prompt = await promptsAPI.getPrompts(PromptsType.FilterBar);
    const answers: FilterBarPromptsAnswer = (await inquirer.prompt(
        prompt.questions,
        prompt.initialAnswers
    )) as FilterBarPromptsAnswer;
    fs = await promptsAPI.submitAnswers(PromptsType.FilterBar, answers);
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
    const promptsAPI = await PromptsAPI.init(basePath, undefined, fs);
    const prompt = await promptsAPI.getPrompts(PromptsType.Chart);
    const answers: ChartPromptsAnswer = (await inquirer.prompt(
        prompt.questions,
        prompt.initialAnswers
    )) as ChartPromptsAnswer;
    fs = await promptsAPI.submitAnswers(PromptsType.Chart, answers);
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
    const promptsAPI = await PromptsAPI.init(basePath, undefined, fs);
    const prompt = await promptsAPI.getPrompts(PromptsType.Table);
    const answers: TablePromptsAnswer = (await inquirer.prompt(
        prompt.questions,
        prompt.initialAnswers
    )) as TablePromptsAnswer;
    fs = await promptsAPI.submitAnswers(PromptsType.Table, answers);
    return fs;
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        let fs = await initialize();
        const promptsAPI = await PromptsAPI.init(sampleAppPath, undefined, fs);
        const buildingBlockPrompts = await promptsAPI.getPrompts(PromptsType.BuildingBlocks);
        const answers: Partial<BuildingBlockTypePromptsAnswer> = await inquirer.prompt(buildingBlockPrompts.questions);

        switch (answers.buildingBlockType) {
            case PromptsType.Chart:
                fs = await generateChartBuildingBlock(fs);
                break;
            case PromptsType.FilterBar:
                fs = await generateFilterBarBuildingBlock(fs);
                break;
            case PromptsType.Table:
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
