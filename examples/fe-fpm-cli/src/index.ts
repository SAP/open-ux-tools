import {
    BuildingBlockType,
    generateBuildingBlock,
    getBuildingBlockTypePrompts,
    getFilterBarBuildingBlockPrompts,
    getTableBuildingBlockPrompts,
    getChartBuildingBlockPrompts
} from '@sap-ux/fe-fpm-writer';
import type { FilterBarPromptsAnswer, ChartPromptsAnswer, BuildingBlockTypePromptsAnswer } from '@sap-ux/fe-fpm-writer';
import type { TablePromptsAnswer } from '@sap-ux/fe-fpm-writer/src/building-block/prompts';
import inquirer from 'inquirer';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join, relative } from 'path';
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

    const answers: FilterBarPromptsAnswer = (await inquirer.prompt(
        await getFilterBarBuildingBlockPrompts(basePath, fs)
    )) as FilterBarPromptsAnswer;
    const { aggregationPath, viewOrFragmentFile, qualifier } = answers;

    answers.metaPath = qualifier;
    fs = generateBuildingBlock<FilterBarPromptsAnswer>(
        basePath,
        {
            aggregationPath,
            viewOrFragmentPath: relative(basePath, viewOrFragmentFile),
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
export async function generateChartBuildingBlock(fs: Editor): Promise<Editor> {
    const basePath = testAppPath;

    const answers: ChartPromptsAnswer = (await inquirer.prompt(
        await getChartBuildingBlockPrompts(basePath, fs)
    )) as ChartPromptsAnswer;

    const { aggregationPath, viewOrFragmentFile, entity, qualifier, bindingContextType } = answers;

    const entityPath = entity.lastIndexOf('.') >= 0 ? entity?.substring?.(entity.lastIndexOf('.') + 1) : entity;
    let navigationProperty = qualifier.substring(0, qualifier.indexOf('@'));
    const _chartQualifier = qualifier.substring(qualifier.indexOf('@'));

    if (bindingContextType === 'relative') {
        answers.metaPath = navigationProperty ? `${navigationProperty}${_chartQualifier}` : _chartQualifier;
    } else {
        if (navigationProperty) {
            navigationProperty = `/${navigationProperty}`;
        }
        answers.contextPath = entityPath ? `/${entityPath}${navigationProperty}` : '';
        answers.metaPath = _chartQualifier;
    }

    fs = generateBuildingBlock<ChartPromptsAnswer>(
        basePath,
        {
            aggregationPath,
            viewOrFragmentPath: relative(basePath, viewOrFragmentFile),
            buildingBlockData: {
                ...answers,
                buildingBlockType: BuildingBlockType.Chart
            }
        },
        fs
    );
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

    const answers: TablePromptsAnswer = (await inquirer.prompt(
        await getTableBuildingBlockPrompts(basePath, fs)
    )) as TablePromptsAnswer;

    const { aggregationPath, viewOrFragmentFile, entity, qualifier, bindingContextType } = answers;

    const entityPath = entity.lastIndexOf('.') >= 0 ? entity?.substring?.(entity.lastIndexOf('.') + 1) : entity;
    let navigationProperty = qualifier.substring(0, qualifier.indexOf('@'));
    const _lineItemQualifier = qualifier.substring(qualifier.indexOf('@'));

    if (bindingContextType === 'relative') {
        answers.metaPath = navigationProperty ? `${navigationProperty}${_lineItemQualifier}` : _lineItemQualifier;
    } else {
        if (navigationProperty) {
            navigationProperty = `/${navigationProperty}`;
        }
        answers.contextPath = entityPath ? `/${entityPath}${navigationProperty}` : '';
        answers.metaPath = _lineItemQualifier;
    }

    fs = generateBuildingBlock<TablePromptsAnswer>(
        basePath,
        {
            aggregationPath,
            viewOrFragmentPath: relative(basePath, viewOrFragmentFile),
            buildingBlockData: {
                ...answers,
                buildingBlockType: BuildingBlockType.Table
            }
        },
        fs
    );
    return fs;
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    try {
        let fs = await initialize();
        const answers: BuildingBlockTypePromptsAnswer = await inquirer.prompt(await getBuildingBlockTypePrompts());

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
