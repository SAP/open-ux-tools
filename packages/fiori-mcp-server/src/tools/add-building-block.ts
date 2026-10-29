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
import { create as createMemFsEditor, type Editor } from 'mem-fs-editor';
import { create as createMemFs } from 'mem-fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { AddBuildingBlockInput, AddBuildingBlockOutput } from '../types/index.js';
import { resolveApplication } from '../utils/index.js';
import { writeAnnotationShell } from './building-block-annotations.js';

/**
 * The custom building block templates (custom-column, custom-filter-field, custom-form-field)
 * access `data.position.anchor` unconditionally, so `position` must always be an object —
 * even when the caller omits it.
 *
 * @param data
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
 *
 * @param data
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

type InsertionPoint = { file: string; aggregationPaths: string[] };

/**
 * Resolves `viewOrFragmentPath` against the application root and returns the absolute path only when it stays
 * inside that root. `viewOrFragmentPath` is MCP-client-supplied, so an absolute path or `../` segments could
 * otherwise point `generateBuildingBlock` (and the discovery reads) at a file outside the app. Returns undefined
 * when the resolved path escapes the canonical root.
 *
 * @param appPath - Absolute application root
 * @param viewOrFragmentPath - Client-supplied view/fragment path (absolute or relative to appPath)
 * @returns The contained absolute path, or undefined when it escapes the root
 */
function resolveWithinApp(appPath: string, viewOrFragmentPath: string): string | undefined {
    const root = resolve(appPath);
    const resolved = isAbsolute(viewOrFragmentPath) ? resolve(viewOrFragmentPath) : resolve(root, viewOrFragmentPath);
    const rel = relative(root, resolved);
    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
        return rel === '' ? resolved : undefined;
    }
    return resolved;
}

/**
 * Builds a discovery response: `needs_input` when candidates were found (the caller picks one and calls again),
 * or `error` when none were — a dead-end that needs a different action (e.g. creating a view first) rather than a
 * retry of the same call.
 *
 * @param message
 * @param insertionPoints
 * @param found
 */
function discovery(message: string, insertionPoints: InsertionPoint[], found: boolean): AddBuildingBlockOutput {
    return { status: found ? 'needs_input' : 'error', modifiedFiles: [], message, insertionPoints };
}

/**
 * Discovery step 1 — list the app's view/fragment files when no target view was supplied.
 *
 * @param appPath
 * @param fs
 */
async function discoverViewFiles(appPath: string, fs: Editor): Promise<AddBuildingBlockOutput> {
    const files = await getFragmentAndViewFiles(appPath, fs);
    const insertionPoints = files.map((file) => ({ file: relative(appPath, file), aggregationPaths: [] }));
    return discovery(
        insertionPoints.length
            ? 'Specify viewOrFragmentPath — candidate view/fragment files are in insertionPoints. Call again with the chosen file to get its aggregationPath options.'
            : 'No view or fragment files were found in the app. Create an FPM custom page or fragment first.',
        insertionPoints,
        insertionPoints.length > 0
    );
}

/**
 * Discovery step 2 — list the valid aggregation XPaths for a chosen view/fragment.
 *
 * @param appPath
 * @param viewOrFragmentPath
 * @param fs
 */
function discoverAggregationPaths(appPath: string, viewOrFragmentPath: string, fs: Editor): AddBuildingBlockOutput {
    const absoluteView = resolveWithinApp(appPath, viewOrFragmentPath);
    if (!absoluteView) {
        return discovery(
            `viewOrFragmentPath "${viewOrFragmentPath}" resolves outside the application root; provide a path inside the app.`,
            [],
            false
        );
    }
    const { inputChoices } = getXPathStringsForXmlFile(absoluteView, fs);
    const aggregationPaths = Object.keys(inputChoices);
    return discovery(
        aggregationPaths.length
            ? 'Specify aggregationPath — valid XPath options for this file are in insertionPoints. Call again with the chosen aggregationPath.'
            : `No insertion points were found in ${viewOrFragmentPath}. Check the path points to a valid view or fragment.`,
        [{ file: viewOrFragmentPath, aggregationPaths }],
        aggregationPaths.length > 0
    );
}

/**
 * Adds a SAP Fiori Elements Building Block to an existing view or fragment XML file.
 *
 * Runs in two modes depending on which inputs are supplied:
 * - **Discovery** — when `viewOrFragmentPath` is omitted the available view/fragment files are returned; when
 *   `viewOrFragmentPath` is given but `aggregationPath` is omitted the valid aggregation XPaths for that file are
 *   returned. Returns `status: 'needs_input'` with `insertionPoints` when candidates exist, or `status: 'error'`
 *   when none do.
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

        if (!viewOrFragmentPath) {
            return await discoverViewFiles(appPath, fs);
        }
        if (!aggregationPath) {
            return discoverAggregationPaths(appPath, viewOrFragmentPath, fs);
        }

        // Execute mode: both paths supplied. buildingBlockData is optional in the schema (it is unused during
        // discovery), so guard it here rather than letting the later property accesses throw.
        if (!buildingBlockData) {
            return {
                status: 'error',
                modifiedFiles: [],
                message: 'buildingBlockData is required when both viewOrFragmentPath and aggregationPath are provided.'
            };
        }

        // Reject a client-supplied path that escapes the app root before any write. Normalise to a path relative to
        // the app root because generateBuildingBlock joins it with appPath (an absolute path would break there).
        const containedView = resolveWithinApp(appPath, viewOrFragmentPath);
        if (!containedView) {
            return {
                status: 'error',
                modifiedFiles: [],
                message: `viewOrFragmentPath "${viewOrFragmentPath}" resolves outside the application root; provide a path inside the app.`
            };
        }
        const normalizedViewPath = relative(resolve(appPath), containedView);

        const generateId = await createIdGenerator({ basePath: appPath, fsEditor: fs });

        const rawBuildingBlockData = applyRteMetaPath(
            applyPositionDefault({
                ...buildingBlockData,
                generateId
            } as BuildingBlock)
        );

        const config: BuildingBlockConfig<BuildingBlock> = {
            viewOrFragmentPath: normalizedViewPath,
            aggregationPath,
            buildingBlockData: rawBuildingBlockData
        };

        const resultFs = await generateBuildingBlock(appPath, config, fs);

        // Best-effort UI annotation shell (Table → LineItem, FilterBar → SelectionFields, Form → FieldGroup) written
        // into the same mem-fs so it commits atomically with the building block XML. Isolated in its own try/catch:
        // nothing in the annotation phase (including a resolveApplication timeout) may abort the commit of an
        // already-generated building block.
        let annotationWarning: string | undefined;
        const annotationFailedMessage =
            'The building block was added, but its UI annotation shell could not be written. Add the annotation manually if the data does not render.';
        try {
            const appDetails = await resolveApplication(appPath);
            if (appDetails?.applicationAccess) {
                const { failed } = await writeAnnotationShell(
                    buildingBlockData,
                    appDetails.applicationAccess,
                    appDetails.appId,
                    resultFs
                );
                if (failed) {
                    annotationWarning = annotationFailedMessage;
                }
            }
        } catch {
            annotationWarning = annotationFailedMessage;
        }

        await resultFs.commit(() => {
            // intentionally empty — commit triggers disk writes internally
        });

        const modifiedFiles = Object.keys(resultFs.dump())
            .map((filePath) => relative(appPath, filePath).replaceAll('\\', '/'));

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
