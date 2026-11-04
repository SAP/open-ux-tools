import { create as createStorage } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { generateBuildingBlock, BuildingBlockType, createIdGenerator } from '@sap-ux/fe-fpm-writer';
import type { BuildingBlockConfig } from '@sap-ux/fe-fpm-writer';
import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types/index.js';
import { resolveApplication, validateWithSchema, logger } from '../../../utils/index.js';
import { ADD_BUILDING_BLOCK } from '../../../constant.js';
import { buildBuildingBlockSchema } from './schema.js';
import { resolveBasePath, resolveWithinApp } from './utils.js';
import { translateBuildingBlockInput, resolveAggregationChildDefaults } from './translate.js';
import { writeAnnotationShell } from './annotations.js';
import type { AnnotationShellInput } from './annotations.js';

/**
 * Executes the add-building-block functionality: validates the input, translates XML attribute names to
 * fe-fpm-writer field names, resolves aggregation-child defaults, generates the building block, writes any
 * required UI annotation shell into the same mem-fs, and commits once.
 *
 * @param input - The execute input: app path and the building block parameters.
 * @returns The execution result with the list of changed files.
 */
export async function executeFunctionality(input: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { parameters, appPath } = input;

    const project = await resolveApplication(appPath);
    if (!project?.root) {
        return {
            functionalityId: ADD_BUILDING_BLOCK,
            status: 'error',
            message: `To add a building block, provide a valid project root or application path. "${appPath}" is not valid.`,
            parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    const basePath = resolveBasePath(project);

    // Validate and extract the three top-level fields — any extra properties pass through via looseObject.
    const schema = buildBuildingBlockSchema();
    const { viewOrFragmentPath, aggregationPath, buildingBlockData } = validateWithSchema(schema, parameters);

    // Reject a client-supplied path that escapes the app base before any write. The returned value is a
    // POSIX-relative path (Windows-safe) that generateBuildingBlock joins with basePath.
    const normalizedViewPath = resolveWithinApp(basePath, viewOrFragmentPath);
    if (!normalizedViewPath) {
        return {
            functionalityId: ADD_BUILDING_BLOCK,
            status: 'error',
            message: `viewOrFragmentPath "${viewOrFragmentPath}" resolves outside the application root; provide a path inside the app.`,
            parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    // Translate XML attribute names to TypeScript field names expected by generateBuildingBlock.
    const bbData = translateBuildingBlockInput(buildingBlockData as Record<string, unknown>);

    const store = createStorage();
    const fs = createEditor(store);

    // The writer uses buildingBlockData.id verbatim (it only substitutes a placeholder when id is empty) and
    // never deduplicates it. An omitted id falls back to the bare building-block type string, so a second
    // block of the same type added to the same view would produce a duplicate UI5 id. Seed an id generator
    // from the target view and run the type-string default through it so repeated adds get unique ids
    // (e.g. "table", then "table1"). An explicitly supplied id is respected as-is.
    const generateId = await createIdGenerator({ basePath, fsEditor: fs });
    const baseId = (bbData['id'] as string | undefined) ?? generateId(bbData['buildingBlockType'] as string);

    // Aggregation children require embededFragment.name / position defaults before passing to generateBuildingBlock.
    const resolvedBbData = resolveAggregationChildDefaults(bbData, baseId, generateId);

    const config = {
        viewOrFragmentPath: normalizedViewPath,
        aggregationPath,
        buildingBlockData: resolvedBbData as BuildingBlockConfig<never>['buildingBlockData'],
        // Page BB must replace whatever element is at aggregationPath (e.g. a sap.m Page shell)
        // rather than append inside it — fe-fpm-writer needs replace:true for this behaviour.
        ...(resolvedBbData['buildingBlockType'] === BuildingBlockType.Page && { replace: true })
    } as BuildingBlockConfig<never>;

    await generateBuildingBlock(basePath, config, fs);

    // Write the UI annotation shell into the same mem-fs (Table, FilterBar, Form) when the project has
    // application access. The write is isolated inside writeAnnotationShell — a failure there is reported
    // via `failed` and never aborts the building-block commit.
    let annotationWarning = '';
    if (project.applicationAccess) {
        const { failed } = await writeAnnotationShell(
            buildingBlockData as unknown as AnnotationShellInput,
            project.applicationAccess,
            project.appId,
            fs
        );
        if (failed) {
            annotationWarning =
                ' Warning: the building block was added but its UI annotation shell could not be written. Add the annotation manually if the data does not render.';
        }
    }

    await new Promise<void>((resolve, reject) => {
        fs.commit((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    const changes = Object.keys(fs.dump());

    logger.info(`[add_building_block] executeFunctionality basePath="${basePath}" changes=${changes.length}`);

    return {
        functionalityId: ADD_BUILDING_BLOCK,
        status: changes.length ? 'success' : 'skipped',
        message:
            (changes.length ? `Building block added. Modified files: ${changes.join(', ')}` : 'No changes were made.') +
            annotationWarning,
        parameters,
        appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}
