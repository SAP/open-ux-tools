import { create as createStorage } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { generateBuildingBlock, BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import type { BuildingBlockConfig } from '@sap-ux/fe-fpm-writer';
import { FioriAnnotationService, ChangeType } from '@sap-ux/fiori-annotation-api';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types/index.js';
import { resolveApplication, validateWithSchema, logger } from '../../../utils/index.js';
import { getMainService } from '../../../page-editor-api/index.js';
import { ADD_BUILDING_BLOCK } from '../../../constant.js';
import { buildBuildingBlockSchema } from './schema.js';
import {
    entitySetFromContextPath,
    qualifierFromMetaPath,
    entitySetFromMetaPath,
    ANNOTATION_SHELL_TERMS,
    resolveAnnotationTarget,
    resolveBasePath
} from './utils.js';
import type { ApplicationAccess } from './utils.js';
import { translateBuildingBlockInput, resolveAggregationChildDefaults } from './translate.js';

/**
 * Builds the annotation value object passed to `FioriAnnotationService.edit` when writing an annotation shell.
 *
 * FieldGroup requires a `record` wrapper (OData complex type) — all other terms use a flat `collection`.
 * The `'com.sap.vocabularies.UI.v1.FieldGroupType'` string is a raw OData type name required by the
 * annotation service; it is not exported as a constant from any package, so it must be hardcoded here.
 *
 * @param term - The OData annotation term (e.g. UIAnnotationTerms.LineItem, UIAnnotationTerms.SelectionFields, UIAnnotationTerms.FieldGroup)
 * @param qualifier - Annotation qualifier, or '' for the default unqualified annotation
 */
function buildAnnotationValue(term: UIAnnotationTerms, qualifier: string): Record<string, unknown> {
    if (term === UIAnnotationTerms.FieldGroup) {
        return {
            term,
            ...(qualifier && { qualifier }),
            record: {
                type: 'com.sap.vocabularies.UI.v1.FieldGroupType',
                propertyValues: [{ name: 'Data', value: { type: 'Collection', Collection: [] } }]
            }
        };
    }
    return { term, ...(qualifier && { qualifier }), collection: [] };
}

/**
 * Writes annotation shells for BB types that require one (Table → UI.LineItem,
 * FilterBar → UI.SelectionFields, Form → UI.FieldGroup). Shells are only written
 * when the annotation does not already exist in a writable file.
 *
 * @param buildingBlockData - The validated building block data object
 * @param applicationAccess - Application access for the resolved project
 * @param appId - Application identifier
 * @param fs - Shared mem-fs editor instance (written before commit)
 */
async function writeAnnotationShells(
    buildingBlockData: Record<string, unknown>,
    applicationAccess: ApplicationAccess,
    appId: string,
    fs: ReturnType<typeof createEditor>
): Promise<{ written: number; failed?: boolean }> {
    const type = buildingBlockData['buildingBlockType'] as BuildingBlockType;
    const term = ANNOTATION_SHELL_TERMS[type];
    if (!term) {
        return { written: 0 };
    }
    // getSchema().entitySets matches by name, not full OData path — strip the path prefix.
    const contextPath = buildingBlockData['contextPath'] as string | undefined;
    const metaPath = buildingBlockData['metaPath'] as string | undefined;
    const entitySetName = contextPath ? entitySetFromContextPath(contextPath) : entitySetFromMetaPath(metaPath);
    if (!entitySetName) {
        logger.warn(
            `[BB] writeAnnotationShells: cannot derive entity set from contextPath="${contextPath}" or metaPath="${metaPath}", skipping`
        );
        return { written: 0 };
    }
    const qualifier = qualifierFromMetaPath(metaPath);

    try {
        const serviceName = getMainService(applicationAccess);
        // commitOnSave: false — we commit the whole mem-fs store in one shot after generateBuildingBlock.
        const annotationService = await FioriAnnotationService.createService(
            applicationAccess.project,
            serviceName,
            appId,
            fs,
            {
                commitOnSave: false,
                clearFileResolutionCache: false,
                writeSapAnnotations: false,
                ignoreChangedFileInitialContent: false
            }
        );
        await annotationService.sync();

        const allFiles = annotationService.getAllFiles();
        const writableFile = allFiles.find((f) => !f.isReadOnly);
        if (!writableFile) {
            logger.warn(`[BB] writeAnnotationShells: no writable annotation file found, skipping`);
            return { written: 0 };
        }

        const rawSchema = annotationService.getSchema();
        const writableUris = new Set(allFiles.filter((f) => !f.isReadOnly).map((f) => f.uri));

        // The annotation target must be the fully qualified type name, not the entity set name.
        // resolveAnnotationTarget handles both direct entity set names and nav property names
        // (relative binding like "to_Booking" that must be resolved to "TravelService.Booking").
        const fullyQualifiedTarget = resolveAnnotationTarget(entitySetName, rawSchema);

        // Don't write a duplicate shell if the annotation already exists in a writable file.
        const alreadyExistsInWritableFile = Object.entries(rawSchema.schema.annotations).some(
            ([sourceUri, annotationLists]) =>
                writableUris.has(sourceUri) &&
                (
                    annotationLists as Array<{
                        target: string;
                        annotations: Array<{ term: string; qualifier?: string }>;
                    }>
                ).some(
                    (list) =>
                        list.target === fullyQualifiedTarget &&
                        list.annotations.some((a) => a.term === term && (a.qualifier ?? '') === qualifier)
                )
        );
        if (alreadyExistsInWritableFile) {
            logger.info(
                `[BB] writeAnnotationShells: ${term}${qualifier ? `#${qualifier}` : ''} already exists in writable file, skipping`
            );
            return { written: 0 };
        }

        annotationService.edit({
            uri: writableFile.uri,
            kind: ChangeType.InsertAnnotation,
            content: {
                type: 'annotation',
                target: fullyQualifiedTarget,
                value: buildAnnotationValue(term, qualifier) as never
            }
        });
        await annotationService.save();
        logger.info(
            `[BB] writeAnnotationShells: saved ${term}${qualifier ? `#${qualifier}` : ''} on ${fullyQualifiedTarget}`
        );
        return { written: 1 };
    } catch (e) {
        logger.warn(`[BB] writeAnnotationShells: failed: ${e instanceof Error ? e.message : String(e)}`);
        return { written: 0, failed: true };
    }
}

/**
 * @param input - The execute functionality input containing appPath and parameters.
 * @returns A promise resolving to the execution output with changed file paths.
 */
export async function executeFunctionality(input: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, parameters } = input;

    const project = await resolveApplication(appPath);
    if (!project?.root) {
        return {
            functionalityId: ADD_BUILDING_BLOCK,
            status: 'Failed',
            message: `Project root not found for app path: ${appPath}`,
            parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    const basePath = resolveBasePath(project);
    logger.info(
        `[BB] executeFunctionality basePath="${basePath}" appPath="${appPath}" root="${project.root}" appId="${project.appId}"`
    );

    // Validate and extract the three top-level fields — any extra properties pass through via looseObject.
    const schema = buildBuildingBlockSchema();
    const { viewOrFragmentPath, aggregationPath, buildingBlockData } = validateWithSchema(schema, parameters);

    // Translate XML attribute names to TypeScript field names expected by generateBuildingBlock.
    const bbData = translateBuildingBlockInput(buildingBlockData as Record<string, unknown>);
    // Use the LLM-provided id as the base; generateBuildingBlock creates its own internal ID generator
    // via createIdGenerator({ basePath, fsEditor }) which correctly deduplicates against existing IDs.
    const baseId = (bbData['id'] as string | undefined) ?? (bbData['buildingBlockType'] as string);

    // Aggregation children require embededFragment.name / position defaults before passing to generateBuildingBlock.
    const resolvedBbData = resolveAggregationChildDefaults(bbData, baseId);

    const config = {
        viewOrFragmentPath,
        aggregationPath,
        buildingBlockData: resolvedBbData as BuildingBlockConfig<never>['buildingBlockData'],
        // Page BB must replace whatever element is at aggregationPath (e.g. a sap.m Page shell)
        // rather than append inside it — fe-fpm-writer needs replace:true for this behaviour.
        ...(resolvedBbData['buildingBlockType'] === BuildingBlockType.Page && { replace: true })
    } as BuildingBlockConfig<never>;

    const store = createStorage();
    const fs = createEditor(store);
    await generateBuildingBlock(basePath, config, fs);

    // Write annotation shell when applicationAccess is available (Table, FilterBar, Form)
    let annotationWarning = '';
    if (project.applicationAccess) {
        const { failed } = await writeAnnotationShells(
            buildingBlockData as Record<string, unknown>,
            project.applicationAccess as ApplicationAccess,
            project.appId,
            fs
        );
        if (failed) {
            annotationWarning = ' Warning: annotation shell write failed — check server log for details.';
        }
    }

    await new Promise<void>((resolve, reject) => {
        fs.commit((err) => (err ? reject(err) : resolve()));
    });

    const changes = Object.keys(fs.dump());

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
