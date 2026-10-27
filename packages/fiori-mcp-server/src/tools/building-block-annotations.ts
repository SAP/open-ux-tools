import { BuildingBlockType } from '@sap-ux/fe-fpm-writer';
import { FioriAnnotationService, ChangeType } from '@sap-ux/fiori-annotation-api';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import { convert } from '@sap-ux/annotation-converter';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { getServiceName } from '../page-editor-api/index.js';
import { logger } from '../utils/index.js';

/**
 * Maps the building block types that need a UI annotation to render data at runtime to their OData term.
 * Only standard metadata-driven building blocks appear here; custom-* types and `action` carry no annotation.
 */
export const ANNOTATION_SHELL_TERMS: Partial<Record<BuildingBlockType, UIAnnotationTerms>> = {
    [BuildingBlockType.Table]: UIAnnotationTerms.LineItem,
    [BuildingBlockType.FilterBar]: UIAnnotationTerms.SelectionFields,
    [BuildingBlockType.Form]: UIAnnotationTerms.FieldGroup
};

/**
 * Extracts the entity set name from an absolute OData context path.
 * The annotation schema indexes entity sets by bare name, so the full path cannot be used directly.
 *
 * @param contextPath - Absolute OData context path, e.g. "/Container/Products"
 * @returns The last path segment (the entity set name)
 */
function entitySetFromContextPath(contextPath: string): string {
    const segments = contextPath.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? contextPath;
}

/**
 * Extracts the entity/navigation segment preceding "/@" from a metaPath.
 *
 * @param metaPath - OData annotation path, or undefined
 * @returns The segment before "/@" (leading slash stripped), or undefined when the path has no entity segment
 */
function entitySetFromMetaPath(metaPath: string | undefined): string | undefined {
    if (!metaPath) {
        return undefined;
    }
    const atIndex = metaPath.indexOf('/@');
    if (atIndex < 0) {
        return undefined;
    }
    const segment = metaPath.slice(0, atIndex).replace(/^\//, '');
    return segment || undefined;
}

/**
 * Extracts the annotation qualifier (the part after "#") from a metaPath.
 *
 * @param metaPath - OData annotation path, or undefined
 * @returns The qualifier string, or an empty string when there is none
 */
function qualifierFromMetaPath(metaPath: string | undefined): string {
    if (!metaPath) {
        return '';
    }
    const hashIndex = metaPath.indexOf('#');
    return hashIndex >= 0 ? metaPath.slice(hashIndex + 1) : '';
}

/**
 * Resolves an entity set or navigation property name to its fully qualified OData type name.
 * A direct entity-set match wins; otherwise the name is treated as a navigation property and
 * resolved through the converted schema (handles relative bindings like "to_Booking").
 *
 * @param entitySetName - Entity set or navigation property name derived from metaPath/contextPath
 * @param rawSchema - Raw schema returned by `annotationService.getSchema()`
 * @returns Fully qualified OData type name to use as the annotation target
 */
function resolveAnnotationTarget(entitySetName: string, rawSchema: unknown): string {
    type RawEntitySet = { name: string; entityTypeName?: string; fullyQualifiedName?: string };
    const entitySets: RawEntitySet[] = (rawSchema as { schema: { entitySets: RawEntitySet[] } }).schema.entitySets;

    const directMatch = entitySets.find((es) => es.name === entitySetName);
    if (directMatch) {
        return directMatch.entityTypeName ?? directMatch.fullyQualifiedName ?? entitySetName;
    }

    const convertedSchema = convert(rawSchema as Parameters<typeof convert>[0]);
    const navTarget = convertedSchema.entitySets
        .flatMap((es) => es.entityType.navigationProperties)
        .find((nav) => nav.name === entitySetName);
    const targetEntitySet = navTarget
        ? convertedSchema.entitySets.find((es) => es.entityTypeName === navTarget.targetType.name)
        : undefined;
    return targetEntitySet?.entityTypeName ?? targetEntitySet?.name ?? entitySetName;
}

/**
 * Builds the value object for `FioriAnnotationService.edit`.
 * FieldGroup needs a `record` wrapper (the `FieldGroupType` complex type is a raw OData type name not exported
 * by any package, so it is hardcoded); every other term uses a flat empty collection.
 *
 * @param term - The OData annotation term being written
 * @param qualifier - Annotation qualifier, or "" for the default unqualified annotation
 * @returns The annotation value object
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
 * Writes the UI annotation shell a standard building block needs to render data at runtime
 * (Table → UI.LineItem, FilterBar → UI.SelectionFields, Form → UI.FieldGroup). The shell is only written
 * when the annotation does not already exist in a writable file. The write targets the shared mem-fs editor
 * and is committed together with the building block XML by the caller.
 *
 * This is best-effort: any failure is logged and reported via the returned `failed` flag rather than thrown,
 * so a building block is still inserted even when the annotation shell cannot be written.
 *
 * @param buildingBlockData - The validated building block data (buildingBlockType + metaPath/contextPath)
 * @param applicationAccess - Resolved application access for the project
 * @param appId - Application identifier
 * @param fs - Shared mem-fs editor instance (written, not committed, here)
 * @returns Count of shells written and whether the attempt failed
 */
export async function writeAnnotationShells(
    buildingBlockData: Record<string, unknown>,
    applicationAccess: ApplicationAccess,
    appId: string,
    fs: Editor
): Promise<{ written: number; failed?: boolean }> {
    const type = buildingBlockData['buildingBlockType'] as BuildingBlockType;
    const term = ANNOTATION_SHELL_TERMS[type];
    if (!term) {
        return { written: 0 };
    }

    const contextPath = buildingBlockData['contextPath'] as string | undefined;
    const metaPath = buildingBlockData['metaPath'] as string | undefined;
    const entitySetName = contextPath ? entitySetFromContextPath(contextPath) : entitySetFromMetaPath(metaPath);
    if (!entitySetName) {
        logger.warn(
            `[add_building_block] annotation shell: cannot derive entity set from contextPath="${contextPath}" or metaPath="${metaPath}", skipping`
        );
        return { written: 0 };
    }
    const qualifier = qualifierFromMetaPath(metaPath);

    try {
        const serviceName = await getServiceName(applicationAccess);
        // commitOnSave: false — the whole mem-fs store is committed in one shot by the caller.
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
            logger.warn(`[add_building_block] annotation shell: no writable annotation file found, skipping`);
            return { written: 0 };
        }

        const rawSchema = annotationService.getSchema();
        const writableUris = new Set(allFiles.filter((f) => !f.isReadOnly).map((f) => f.uri));
        const fullyQualifiedTarget = resolveAnnotationTarget(entitySetName, rawSchema);

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
                `[add_building_block] annotation shell: ${term}${
                    qualifier ? `#${qualifier}` : ''
                } already exists, skipping`
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
            `[add_building_block] annotation shell: wrote ${term}${
                qualifier ? `#${qualifier}` : ''
            } on ${fullyQualifiedTarget}`
        );
        return { written: 1 };
    } catch (e) {
        logger.warn(`[add_building_block] annotation shell: failed: ${e instanceof Error ? e.message : String(e)}`);
        return { written: 0, failed: true };
    }
}
