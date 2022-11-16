import prompts from 'prompts';
import { Chart, FilterBar, getFilterBarBuildingBlockPrompts } from '@sap-ux/fe-fpm-writer';
import { BuildingBlockType, generateBuildingBlock } from '@sap-ux/fe-fpm-writer';
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
    return fs;
}

/**
 * Generates a filter bar building block by prompting the user for the required information.
 *
 * @param {Editor} fs the memfs editor object
 * @returns {Promise<Editor>} the updated memfs editor object
 **/
async function generateFilterBarBuildingBlock(fs: Editor): Promise<Editor> {
    const answers: FilterBar = await prompts(await getFilterBarBuildingBlockPrompts());
    fs = generateBuildingBlock<FilterBar>(
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
 **/
async function generateChartBuildingBlock(fs: Editor): Promise<Editor> {
    const answers: Chart = await prompts(await getChartBuildingBlockPrompts());
    fs = generateBuildingBlock<Chart>(
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
    fs = await generateFilterBarBuildingBlock(fs);
    fs = await generateChartBuildingBlock(fs);
    await promisify(fs.commit).call(fs);
})();
