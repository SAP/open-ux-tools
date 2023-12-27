import {
    BuildingBlockType,
    ChartPromptsAnswer,
    FilterBarPromptsAnswer,
    TablePromptsAnswer,
    generateBuildingBlock
} from '@sap-ux/fe-fpm-writer';
import { BuildingBlockConfig } from '@sap-ux/fe-fpm-writer/dist/building-block/types';
import { Editor } from 'mem-fs-editor';
import { relative } from 'path';
import { SupportedBuildingBlocks } from '../../stories/utils/types';

function getContextAndMetaPaths(entity: string, qualifier: string, bindingContextType: string) {
    let metaPath: string,
        contextPath: string | undefined = undefined;
    const entityPath = entity.lastIndexOf('.') >= 0 ? entity?.substring?.(entity.lastIndexOf('.') + 1) : entity;
    let navigationProperty = qualifier.substring(0, qualifier.indexOf('@'));
    const _qualifier = qualifier.substring(qualifier.indexOf('@'));

    if (bindingContextType === 'relative') {
        metaPath = navigationProperty ? `${navigationProperty}${_qualifier}` : _qualifier;
    } else {
        if (navigationProperty) {
            navigationProperty = `/${navigationProperty}`;
        }
        contextPath = entityPath ? `/${entityPath}${navigationProperty}` : '';
        metaPath = _qualifier;
    }
    return { contextPath, metaPath };
}

function getFilterBarBuildingBlockConfig(
    answers: FilterBarPromptsAnswer,
    basePath: string
): BuildingBlockConfig<FilterBarPromptsAnswer> {
    const { aggregationPath, viewOrFragmentFile, qualifier } = answers;
    answers.metaPath = qualifier;
    return {
        aggregationPath,
        viewOrFragmentPath: relative(basePath, viewOrFragmentFile),
        buildingBlockData: {
            ...answers,
            buildingBlockType: BuildingBlockType.FilterBar
        }
    };
}

function getChartBuildingBlockConfig(
    answers: ChartPromptsAnswer,
    basePath: string
): BuildingBlockConfig<ChartPromptsAnswer> {
    const { aggregationPath, viewOrFragmentFile, entity, qualifier, bindingContextType } = answers;

    const { contextPath, metaPath } = getContextAndMetaPaths(entity, qualifier, bindingContextType);
    answers.contextPath = contextPath;
    answers.metaPath = metaPath;

    return {
        aggregationPath,
        viewOrFragmentPath: relative(basePath, viewOrFragmentFile),
        buildingBlockData: {
            ...answers,
            buildingBlockType: BuildingBlockType.Chart
        }
    };
}

function getTableBuildingBlockConfig(
    answers: TablePromptsAnswer,
    basePath: string
): BuildingBlockConfig<TablePromptsAnswer> {
    const { aggregationPath, viewOrFragmentFile, entity, qualifier, bindingContextType } = answers;

    const { contextPath, metaPath } = getContextAndMetaPaths(entity, qualifier, bindingContextType);
    answers.contextPath = contextPath;
    answers.metaPath = metaPath;
    return {
        aggregationPath,
        viewOrFragmentPath: relative(basePath, viewOrFragmentFile),
        buildingBlockData: {
            ...answers,
            buildingBlockType: BuildingBlockType.Table
        }
    };
}

const configDataGetters = <T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer>(
    buildingBlockType: BuildingBlockType
): ((answers: T, basePath: string) => BuildingBlockConfig<T>) =>
    ({
        [SupportedBuildingBlocks.FilterBar]: getFilterBarBuildingBlockConfig,
        [SupportedBuildingBlocks.Chart]: getChartBuildingBlockConfig,
        [SupportedBuildingBlocks.Table]: getTableBuildingBlockConfig
    }[buildingBlockType]);

export const fpmWriterApi = <T extends TablePromptsAnswer | FilterBarPromptsAnswer | ChartPromptsAnswer>(
    buildingBlockType: BuildingBlockType,
    answers: T,
    basePath: string,
    fs: Editor
): Editor => {
    const getConfigData = configDataGetters(buildingBlockType);
    if (!getConfigData) {
        throw new Error(`No writer found for building block type: ${buildingBlockType}`);
    }
    const configData = getConfigData(answers, basePath);
    fs = generateBuildingBlock(basePath, configData, fs);
    return fs;
};
