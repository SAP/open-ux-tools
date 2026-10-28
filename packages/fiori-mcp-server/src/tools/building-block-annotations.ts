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

/** Minimal building-block fields the annotation-shell writer needs. */
export interface AnnotationShellInput {
    buildingBlockType: BuildingBlockType;
    contextPath?: string;
    metaPath?: string;
}

/** An entity set as exposed by the raw schema from `FioriAnnotationService.getSchema()`. */
type RawEntitySet = { name: string; entityTypeName?: string; fullyQualifiedName?: string };

/** An annotation list (a target and the annotations on it) as exposed by the raw schema. */
type RawAnnotationList = { target: string; annotations: Array<{ term: string; qualifier?: string }> };

/** The subset of `FioriAnnotationService.getSchema()` this module reads. */
type RawSchema = { schema: { entitySets: RawEntitySet[]; annotations: Record<string, RawAnnotationList[]> } };

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
function resolveAnnotationTarget(entitySetName: string, rawSchema: RawSchema): string {
    const directMatch = rawSchema.schema.entitySets.find((es) => es.name === entitySetName);
    if (directMatch) {
        return directMatch.entityTypeName ?? directMatch.fullyQualifiedName ?? entitySetName;
    }

    const convertedSchema = convert(rawSchema as unknown as Parameters<typeof convert>[0]);
    const navTarget = convertedSchema.entitySets
        .flatMap((es) => es.entityType.navigationProperties)
        .find((nav) => nav.name === entitySetName);
    // The target is the navigation's target entity type FQN. Use targetType.fullyQualifiedName directly rather than
    // looking it up via a top-level entity set — a contained (composition) target type has no own entity set, and the
    // lookup would then wrongly fall back to the bare nav name.
    return navTarget?.targetType.fullyQualifiedName ?? entitySetName;
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
 * True when `term` + `qualifier` already annotates `target` anywhere in the schema — including read-only sources
 * such as backend metadata. Scanning every source (not just writable files) prevents writing an empty shell that
 * would shadow an existing populated annotation at runtime.
 *
 * @param rawSchema - Raw schema returned by `annotationService.getSchema()`
 * @param target - Fully qualified annotation target
 * @param term - OData annotation term
 * @param qualifier - Annotation qualifier, or "" for the default unqualified annotation
 * @returns Whether the annotation already exists
 */
function annotationExists(rawSchema: RawSchema, target: string, term: string, qualifier: string): boolean {
    for (const annotationLists of Object.values(rawSchema.schema.annotations)) {
        for (const list of annotationLists) {
            if (
                list.target === target &&
                list.annotations.some((a) => a.term === term && (a.qualifier ?? '') === qualifier)
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Writes the UI annotation shell a standard building block needs to render data at runtime
 * (Table → UI.LineItem, FilterBar → UI.SelectionFields, Form → UI.FieldGroup). The shell is only written
 * when the annotation does not already exist (in any source file). The write targets the shared mem-fs editor
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
    buildingBlockData: AnnotationShellInput,
    applicationAccess: ApplicationAccess,
    appId: string,
    fs: Editor
): Promise<{ written: number; failed?: boolean }> {
    const { buildingBlockType, contextPath, metaPath } = buildingBlockData;
    const term = ANNOTATION_SHELL_TERMS[buildingBlockType];
    if (!term) {
        return { written: 0 };
    }

    const entitySetName = contextPath ? entitySetFromContextPath(contextPath) : entitySetFromMetaPath(metaPath);
    if (!entitySetName) {
        logger.warn(
            `[add_building_block] annotation shell: cannot derive entity set from contextPath="${contextPath}" or metaPath="${metaPath}", skipping`
        );
        return { written: 0 };
    }
    const qualifier = qualifierFromMetaPath(metaPath);
    const qualifierSuffix = qualifier ? `#${qualifier}` : '';

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

        const writableFile = annotationService.getAllFiles().find((f) => !f.isReadOnly);
        if (!writableFile) {
            logger.warn(`[add_building_block] annotation shell: no writable annotation file found, skipping`);
            return { written: 0 };
        }

        const rawSchema = annotationService.getSchema() as unknown as RawSchema;
        const fullyQualifiedTarget = resolveAnnotationTarget(entitySetName, rawSchema);

        if (annotationExists(rawSchema, fullyQualifiedTarget, term, qualifier)) {
            logger.info(`[add_building_block] annotation shell: ${term}${qualifierSuffix} already exists, skipping`);
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
            `[add_building_block] annotation shell: wrote ${term}${qualifierSuffix} on ${fullyQualifiedTarget}`
        );
        return { written: 1 };
    } catch (e) {
        logger.warn(`[add_building_block] annotation shell: failed: ${e instanceof Error ? e.message : String(e)}`);
        return { written: 0, failed: true };
    }
}
