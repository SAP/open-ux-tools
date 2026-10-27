import {
    generateBuildingBlock,
    createIdGenerator,
    BuildingBlockType,
    getFragmentAndViewFiles,
    getXPathStringsForXmlFile
} from '@sap-ux/fe-fpm-writer';
import type {
    BuildingBlock,
    BuildingBlockConfig,
    CustomColumn,
    CustomFilterField,
    CustomFormField,
    RichTextEditor
} from '@sap-ux/fe-fpm-writer';
import { create as createMemFsEditor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { isAbsolute, join, relative } from 'node:path';
import type { AddBuildingBlockInput, AddBuildingBlockOutput } from '../types/index.js';
import { resolveApplication } from '../utils/index.js';
import { writeAnnotationShells } from './building-block-annotations.js';

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
 *
 * Runs in two modes depending on which inputs are supplied:
 * - **Discovery** — when `viewOrFragmentPath` is omitted the available view/fragment files are returned; when
 *   `viewOrFragmentPath` is given but `aggregationPath` is omitted the valid aggregation XPaths for that file are
 *   returned. Both return `status: 'needs_input'` with `insertionPoints` so the caller can pick and call again.
 * - **Execute** — when both paths are supplied, calls `generateBuildingBlock()` from `@sap-ux/fe-fpm-writer`,
 *   writes any required UI annotation shell (Table/FilterBar/Form), commits the mem-fs editor to disk, and returns
 *   the list of modified file paths.
 *
 * @param params - Input parameters: app path, target view, aggregation XPath, BB config data
 * @returns Modified file paths and status, or discovered insertion points when more input is needed
 */
export async function addBuildingBlock(params: AddBuildingBlockInput): Promise<AddBuildingBlockOutput> {
    const { appPath, viewOrFragmentPath, aggregationPath, buildingBlockData } = params;

    try {
        const store = createMemFs();
        const fs = createMemFsEditor(store);

        // Discovery: no target view yet — return the available view/fragment files.
        if (!viewOrFragmentPath) {
            const files = await getFragmentAndViewFiles(appPath, fs);
            const insertionPoints = files.map((file) => ({ file: relative(appPath, file), aggregationPaths: [] }));
            return {
                status: 'needs_input',
                modifiedFiles: [],
                message: insertionPoints.length
                    ? 'Specify viewOrFragmentPath — candidate view/fragment files are in insertionPoints. Call again with the chosen file to get its aggregationPath options.'
                    : 'No view or fragment files were found in the app. Create an FPM custom page or fragment first.',
                insertionPoints
            };
        }

        // Discovery: target view known but no aggregation yet — return the valid XPaths for that file.
        if (!aggregationPath) {
            const absoluteView = isAbsolute(viewOrFragmentPath)
                ? viewOrFragmentPath
                : join(appPath, viewOrFragmentPath);
            const { inputChoices } = getXPathStringsForXmlFile(absoluteView, fs);
            const aggregationPaths = Object.keys(inputChoices);
            return {
                status: 'needs_input',
                modifiedFiles: [],
                message: aggregationPaths.length
                    ? 'Specify aggregationPath — valid XPath options for this file are in insertionPoints. Call again with the chosen aggregationPath.'
                    : `No insertion points were found in ${viewOrFragmentPath}. Check the path points to a valid view or fragment.`,
                insertionPoints: [{ file: viewOrFragmentPath, aggregationPaths }]
            };
        }

        const generateId = await createIdGenerator({ basePath: appPath, fsEditor: fs });

        const rawBuildingBlockData = applyRteMetaPath(
            applyPositionDefault({
                ...buildingBlockData,
                generateId
            } as BuildingBlock)
        );

        const config: BuildingBlockConfig<BuildingBlock> = {
            viewOrFragmentPath,
            aggregationPath,
            buildingBlockData: rawBuildingBlockData
        };

        const resultFs = await generateBuildingBlock(appPath, config, fs);

        // Write the UI annotation shell (Table → LineItem, FilterBar → SelectionFields, Form → FieldGroup) into the
        // same mem-fs so it commits atomically with the building block XML. Best-effort — failure is non-fatal.
        let annotationWarning: string | undefined;
        const appDetails = await resolveApplication(appPath);
        if (appDetails?.applicationAccess) {
            const { failed } = await writeAnnotationShells(
                buildingBlockData as unknown as Record<string, unknown>,
                appDetails.applicationAccess,
                appDetails.appId,
                resultFs
            );
            if (failed) {
                annotationWarning =
                    'The building block was added, but its UI annotation shell could not be written. Add the annotation manually if the data does not render.';
            }
        }

        await resultFs.commit(() => {
            // intentionally empty — commit triggers disk writes internally
        });

        const modifiedFiles = Object.keys(resultFs.dump()).map((filePath) => relative(appPath, filePath));

        return {
            status: 'success',
            modifiedFiles,
            message: `Successfully added ${buildingBlockData.buildingBlockType} building block '${buildingBlockData.id}' to ${viewOrFragmentPath}.`,
            ...(annotationWarning && { annotationWarning })
        };
    } catch (error) {
        return {
            status: 'error',
            modifiedFiles: [],
            message: error instanceof Error ? error.message : String(error)
        };
    }
}
