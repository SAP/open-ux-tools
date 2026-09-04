import { generateBuildingBlock, createIdGenerator, BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import type { BuildingBlock, BuildingBlockConfig, CustomColumn, CustomFilterField, CustomFormField, RichTextEditor } from '@sap-ux/fe-fpm-writer';
import { create as createMemFsEditor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { relative } from 'node:path';
import type { AddBuildingBlockInput, AddBuildingBlockOutput } from '../types/index.js';

/**
 * The custom building block templates (custom-column, custom-filter-field, custom-form-field)
 * access `data.position.anchor` unconditionally, so `position` must always be an object —
 * even when the caller omits it.
 */
function applyPositionDefault(data: BuildingBlock): BuildingBlock {
    const type = data.buildingBlockType;
    if (
        type === BuildingBlockType.CustomColumn ||
        type === BuildingBlockType.CustomFilterField ||
        type === BuildingBlockType.CustomFormField
    ) {
        const typed = data as CustomColumn | CustomFilterField | CustomFormField;
        if (!typed.position) {
            // The template accesses position.anchor and position.placement unconditionally
            // so we supply a no-op default rather than letting the template crash on undefined.
            typed.position = {} as NonNullable<typeof typed.position>;
        }
    }
    return data;
}

/**
 * The fe-fpm-writer constructs metaPath from an object { entitySet, qualifier } combined with
 * targetProperty. When an agent passes targetProperty as a fully-qualified path (e.g.
 * "/Products/description"), there is no entitySet to combine — the writer emits metaPath="".
 * This function short-circuits that by copying targetProperty directly into metaPath so the
 * template receives the correct value without needing entitySet.
 */
function applyRteMetaPath(data: BuildingBlock): BuildingBlock {
    if (data.buildingBlockType !== BuildingBlockType.RichTextEditor) {
        return data;
    }
    const rte = data as RichTextEditor;
    if (rte.targetProperty && !rte.metaPath) {
        return { ...rte, metaPath: rte.targetProperty };
    }
    return data;
}

/**
 * Adds a SAP Fiori Elements Building Block to an existing view or fragment XML file.
 * Calls `generateBuildingBlock()` from `@sap-ux/fe-fpm-writer`, commits the mem-fs editor
 * to disk, and returns the list of modified file paths.
 *
 * @param params - Input parameters: app path, target view, aggregation XPath, BB config data
 * @returns Modified file paths and status
 */
export async function addBuildingBlock(params: AddBuildingBlockInput): Promise<AddBuildingBlockOutput> {
    const { appPath, viewOrFragmentPath, aggregationPath, buildingBlockData } = params;

    try {
        const store = createMemFs();
        const fs = createMemFsEditor(store);

        const generateId = await createIdGenerator({ basePath: appPath, fsEditor: fs });

        const rawBuildingBlockData = applyRteMetaPath(applyPositionDefault({
            ...buildingBlockData,
            generateId
        } as BuildingBlock));

        const config: BuildingBlockConfig<BuildingBlock> = {
            viewOrFragmentPath,
            aggregationPath,
            buildingBlockData: rawBuildingBlockData
        };

        const resultFs = await generateBuildingBlock(appPath, config, fs);

        await resultFs.commit(() => {
            // intentionally empty — commit triggers disk writes internally
        });

        const modifiedFiles = Object.keys(resultFs.dump()).map((filePath) => relative(appPath, filePath));

        return {
            status: 'success',
            modifiedFiles,
            message: `Successfully added ${buildingBlockData.buildingBlockType} building block '${buildingBlockData.id}' to ${viewOrFragmentPath}.`
        };
    } catch (error) {
        return {
            status: 'error',
            modifiedFiles: [],
            message: error instanceof Error ? error.message : String(error)
        };
    }
}
