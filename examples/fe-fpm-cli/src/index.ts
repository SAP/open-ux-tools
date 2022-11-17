import prompts from 'prompts';
import {
    BuildingBlockType,
    generateBuildingBlock,
    getBuildingBlockTypePrompts,
    getFilterBarBuildingBlockPrompts
} from '@sap-ux/fe-fpm-writer';
import type { FilterBarPromptsAnswer, ChartPromptsAnswer, BuildingBlockTypePromptsAnswer } from '@sap-ux/fe-fpm-writer';
import { getChartBuildingBlockPrompts } from '@sap-ux/fe-fpm-writer';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import { promises as fsPromises } from 'fs';
import { promisify } from 'util';

const sampleAppPath = join(__dirname, '../sample/fe-app');
const testAppPath = join(__dirname, '../test-output/fe-app', `${Date.now()}`);
const xmlViewFilePath = 'webapp/ext/main/Main.view.xml';
const manifestFilePath = 'webapp/manifest.json';

/**
 * Initializes the memfs and copies over the sample Fiori elements applicaiton.
 *
 * @returns {Promise<Editor>} the memfs editor object
 */
async function initialize(): Promise<Editor> {
    const fs = create(createStorage());

    // Copy manifest and view xml files to memfs
    const manifestContent = (
        await fsPromises.readFile(join(sampleAppPath, manifestFilePath), 'utf-8')
    ).toLocaleString();
    fs.write(join(testAppPath, manifestFilePath), manifestContent);
    const xmlViewContent = (await fsPromises.readFile(join(sampleAppPath, xmlViewFilePath), 'utf-8')).toLocaleString();
    fs.write(join(testAppPath, xmlViewFilePath), xmlViewContent);
    await promisify(fs.commit).call(fs);
    return fs;
}

/**
 * Generates a filter bar building block by prompting the user for the required information.
 *
 * @param {Editor} fs the memfs editor object
 * @returns {Promise<Editor>} the updated memfs editor object
 */
async function generateFilterBarBuildingBlock(fs: Editor): Promise<Editor> {
    const answers: FilterBarPromptsAnswer = await prompts(await getFilterBarBuildingBlockPrompts());
    fs = generateBuildingBlock<FilterBarPromptsAnswer>(
        testAppPath,
        {
            aggregationPath: `/mvc:View/*[local-name()='Page']/*[local-name()='content']`,
            viewOrFragmentPath: xmlViewFilePath,
            buildingBlockData: {
                ...answers,
                buildingBlockType: BuildingBlockType.FilterBar
            }
        },
        fs
    );
    return fs;
}

/**
 * Generates a chart building block by prompting the user for the required information.
 *
 * @param {Editor} fs the memfs editor object
 * @returns {Promise<Editor>} the updated memfs editor object
 */
async function generateChartBuildingBlock(fs: Editor): Promise<Editor> {
    const answers: ChartPromptsAnswer = await prompts(await getChartBuildingBlockPrompts(testAppPath, fs));
    fs = generateBuildingBlock<ChartPromptsAnswer>(
        testAppPath,
        {
            aggregationPath: `/mvc:View/*[local-name()='Page']/*[local-name()='content']`,
            viewOrFragmentPath: xmlViewFilePath,
            buildingBlockData: {
                ...answers,
                buildingBlockType: BuildingBlockType.Chart
            }
        },
        fs
    );
    return fs;
}

(async () => {
    let fs = await initialize();
    const answers: BuildingBlockTypePromptsAnswer = await prompts(await getBuildingBlockTypePrompts());
    switch (answers.buildingBlockType) {
        case BuildingBlockType.Chart:
            fs = await generateChartBuildingBlock(fs);
            break;
        case BuildingBlockType.FilterBar:
            fs = await generateFilterBarBuildingBlock(fs);
            break;
        default:
            break;
    }
    await promisify(fs.commit).call(fs);
})();
