import {
    BuildingBlockType,
    getFragmentAndViewFiles,
    MIN_UI5_VERSION_RICH_TEXT_EDITOR,
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK,
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT
} from '@sap-ux/fe-fpm-writer';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import { convert } from '@sap-ux/annotation-converter';
import { create } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import type { Appdetails } from '../../../types/index.js';

/** Resolved application access — narrowed from Appdetails which allows undefined. */
export type ApplicationAccess = NonNullable<Appdetails['applicationAccess']>;

/**
 * Resolves the base filesystem path for a building block operation.
 *
 * When the project has a full application access (resolved via createApplicationAccess),
 * the correct base is `<projectRoot>/<appId>` — the app subfolder within the project.
 * Without it (fallback path via findProjectRoot) the project root is used directly.
 *
 * The `project` field on ApplicationAccess is not part of the exported TypeScript type
 * from @sap-ux/project-access, so a cast is unavoidable here; isolating it in one place
 * prevents the same cast from appearing in every caller.
 *
 * @param project - Resolved application details from resolveApplication
 * @returns Absolute path to use as the basePath for generateBuildingBlock
 */
export function resolveBasePath(project: Appdetails): string {
    // TODO: replace with some thing from project-access
    const appAccess = project.applicationAccess as { project: { root: string } } | undefined;
    return appAccess ? `${appAccess.project.root}/${project.appId}` : project.root;
}

/**
 * Maps aggregation-child BB types to the local name of their required parent macro element.
 * Used to match xpaths returned by getXPathStringsForXmlFile to the correct parent.
 */
export const AGGREGATION_PARENT_MACRO: Partial<Record<BuildingBlockType, string>> = {
    [BuildingBlockType.CustomColumn]: 'Table',
    [BuildingBlockType.Action]: 'Table',
    [BuildingBlockType.CustomFilterField]: 'FilterBar',
    [BuildingBlockType.CustomFormField]: 'Form',
    [BuildingBlockType.RichTextEditorButtonGroups]: 'RichTextEditorWithMetadata'
};

/** Set of BB types that are inserted as children of a parent macro aggregation. Derived from AGGREGATION_PARENT_MACRO. */
export const AGGREGATION_CHILD_TYPES = new Set<BuildingBlockType>(
    Object.keys(AGGREGATION_PARENT_MACRO) as BuildingBlockType[]
);

/**
 * Extracts the entity set name from a building block contextPath.
 *
 * The LLM provides contextPath as an absolute OData path like '/Container/Products'.
 * writeAnnotationShells looks up the entity set by name in the annotation schema
 * (rawSchema.schema.entitySets.find(es => es.name === entitySetName)), so the full
 * path cannot be passed directly — only the bare entity set name matches.
 *
 * @param contextPath - Absolute OData context path, e.g. '/Container/Products'
 * @returns The last path segment, which is the entity set name
 * @example
 * entitySetFromContextPath('/Container/Products') // → 'Products'
 * entitySetFromContextPath('/Products')           // → 'Products'
 */
export function entitySetFromContextPath(contextPath: string): string {
    const segments = contextPath.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? contextPath;
}

/**
 * Extracts the entity set name from a building block metaPath.
 *
 * The LLM provides metaPath as an OData annotation path. The segment before '/@'
 * is the entity set (or navigation property). FioriAnnotationService needs this to
 * write the annotation shell to the correct entity target.
 *
 * @param metaPath - OData annotation path from buildingBlockData, or undefined
 * @returns The entity/navigation segment before '/@', or undefined if not present
 * @example
 * entitySetFromMetaPath('Products/@com.sap.vocabularies.UI.v1.LineItem')    // → 'Products'
 * entitySetFromMetaPath('/Products/@com.sap.vocabularies.UI.v1.LineItem')   // → 'Products'
 * entitySetFromMetaPath('to_Booking/@com.sap.vocabularies.UI.v1.LineItem')  // → 'to_Booking'
 * entitySetFromMetaPath('@com.sap.vocabularies.UI.v1.FieldGroup')           // → undefined
 */
export function entitySetFromMetaPath(metaPath: string | undefined): string | undefined {
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
 * Extracts the annotation qualifier from a building block metaPath.
 *
 * When a BB targets a qualified annotation (e.g. a Table bound to a specific LineItem variant),
 * the metaPath includes a '#qualifier' suffix. FioriAnnotationService needs the qualifier
 * to avoid duplicating an annotation shell that already exists under that qualifier.
 *
 * @param metaPath - OData annotation path from buildingBlockData, or undefined
 * @returns The qualifier string after '#', or empty string if none
 * @example
 * qualifierFromMetaPath('@com.sap.vocabularies.UI.v1.LineItem#MyVariant') // → 'MyVariant'
 * qualifierFromMetaPath('@com.sap.vocabularies.UI.v1.LineItem')           // → ''
 * qualifierFromMetaPath(undefined)                                         // → ''
 */
export function qualifierFromMetaPath(metaPath: string | undefined): string {
    if (!metaPath) {
        return '';
    }
    const hashIndex = metaPath.indexOf('#');
    return hashIndex >= 0 ? metaPath.slice(hashIndex + 1) : '';
}

/**
 * Returns all view and fragment XML file paths for a Fiori app.
 *
 * @param appPath - Absolute path to the Fiori app root
 * @returns Array of absolute paths to .view.xml and .fragment.xml files
 */
export async function getViewAndFragmentPaths(appPath: string): Promise<string[]> {
    const store = create();
    const fs = createEditor(store);
    return getFragmentAndViewFiles(appPath, fs);
}

/**
 * Converts a kebab-case BuildingBlockType value to a PascalCase display name for LLM prompts.
 * BuildingBlockType enum values use kebab-case (e.g. 'filter-bar', 'custom-column') because
 * that is what the XML macro attributes expect at runtime. But LLM-facing descriptions should
 * use the readable PascalCase form that matches the TypeScript enum key names.
 *
 * @param value
 * @example
 * toDisplayName('filter-bar')      // → 'FilterBar'
 */
export const toDisplayName = (value: string): string =>
    value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

// Derived display strings — computed from AGGREGATION_PARENT_MACRO
export const aggregationChildTypeNames = Object.keys(AGGREGATION_PARENT_MACRO).map(toDisplayName).join(', ');
export const buildingBlockTypeNames = Object.values(BuildingBlockType)
    .filter((type) => !(type in AGGREGATION_PARENT_MACRO))
    .map(toDisplayName)
    .join(', ');
/**
 * Maps BB types that require an annotation shell to their OData term.
 * Shared between execute-functionality (writes the shell) and get-functionality-details (describes it).
 * Add new entries here when new BB types need auto-generated annotation shells.
 */
export const ANNOTATION_SHELL_TERMS: Partial<Record<BuildingBlockType, UIAnnotationTerms>> = {
    [BuildingBlockType.FilterBar]: UIAnnotationTerms.SelectionFields,
    [BuildingBlockType.Table]: UIAnnotationTerms.LineItem,
    [BuildingBlockType.Form]: UIAnnotationTerms.FieldGroup
};

// UIAnnotationTerms values are the fully qualified OData term names — the exact form used in XML annotations.
export const annotationShellTermLabels = Object.values(ANNOTATION_SHELL_TERMS).join(', ');

/** Comma-separated PascalCase display names of BB types that get an auto-generated annotation shell. */
export const annotationShellTypeNames = Object.keys(ANNOTATION_SHELL_TERMS).map(toDisplayName).join(', ');

/**
 * Produces a human-readable mapping of each aggregation child type to its required parent macro element.
 * Derived from AGGREGATION_PARENT_MACRO so it updates automatically when new child types are added.
 *
 * @example
 * aggregationParentMacroMappingNote()
 * // → 'CustomColumn → Table, Action → Table, CustomFilterField → FilterBar, ...'
 */
export const aggregationParentMacroMappingNote = Object.entries(AGGREGATION_PARENT_MACRO)
    .map(([child, parent]) => `${toDisplayName(child)} → ${parent}`)
    .join(', ');

/**
 * Describes the minimum UI5 version requirements for a BB type.
 * Most types have a single threshold. Page is special — it has a basic layout threshold
 * and a higher threshold for full layout support.
 */
export interface BbTypeVersionRequirement {
    /** Minimum UI5 version for basic support. */
    minVersion: string;
    /** Minimum UI5 version for full layout support, if applicable. */
    fullLayoutVersion?: string;
}

/**
 * Maps each BB type that requires a minimum UI5 version to its version requirement.
 * Add new entries here when new version-gated types are introduced — the description updates automatically.
 */
export const BB_TYPE_MIN_UI5_VERSION: Partial<Record<BuildingBlockType, BbTypeVersionRequirement>> = {
    [BuildingBlockType.RichTextEditor]: { minVersion: MIN_UI5_VERSION_RICH_TEXT_EDITOR },
    [BuildingBlockType.RichTextEditorButtonGroups]: { minVersion: MIN_UI5_VERSION_RICH_TEXT_EDITOR },
    [BuildingBlockType.Page]: {
        minVersion: MIN_UI5_VERSION_PAGE_BUILDING_BLOCK,
        fullLayoutVersion: MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT
    }
};

/**
 * Human-readable note listing which BB types require a minimum UI5 version, grouped by version.
 * Derived entirely from BB_TYPE_MIN_UI5_VERSION so it can never drift from the actual constraints.
 *
 * @example
 * // → 'Types requiring UI5 >= 1.117.0: RichTextEditor, RichTextEditorButtonGroups.
 * //    Types requiring UI5 >= 1.136.0: Page (basic). Types requiring UI5 >= 1.145.0: Page (full layout).'
 */
export const versionRequirementsNote: string = (() => {
    const byVersion = new Map<string, string[]>();
    for (const [type, requirement] of Object.entries(BB_TYPE_MIN_UI5_VERSION) as [
        BuildingBlockType,
        BbTypeVersionRequirement
    ][]) {
        const displayName = toDisplayName(type);

        const basicEntries = byVersion.get(requirement.minVersion) ?? [];
        // Only add the '(basic)' qualifier when the type also has a fullLayoutVersion
        basicEntries.push(requirement.fullLayoutVersion ? `${displayName} (basic)` : displayName);
        byVersion.set(requirement.minVersion, basicEntries);

        if (requirement.fullLayoutVersion) {
            const fullEntries = byVersion.get(requirement.fullLayoutVersion) ?? [];
            fullEntries.push(`${displayName} (full layout)`);
            byVersion.set(requirement.fullLayoutVersion, fullEntries);
        }
    }
    return [...byVersion.entries()]
        .map(([version, types]) => `Types requiring UI5 >= ${version}: ${types.join(', ')}.`)
        .join(' ');
})();

/**
 * Resolves an entity set name or navigation property name to its fully qualified OData type name.
 *
 * When the LLM provides a relative binding (e.g. metaPath="to_Booking/@..."), the segment before
 * `/@` is a navigation property name, not an entity set name. `FioriAnnotationService.getSchema()`
 * entity sets are indexed by entity set name — so a nav property lookup fails and falls back to the
 * raw string, producing a wrong annotation target like `Target="to_Booking"`.
 *
 * This function first tries a direct entity set name match, then falls back to resolving the name
 * as a navigation property through the converted schema.
 *
 * @param entitySetName - Entity set name or navigation property name derived from metaPath/contextPath
 * @param rawSchema - Raw schema from `annotationService.getSchema()`
 * @returns Fully qualified OData type name to use as the annotation target
 */
export function resolveAnnotationTarget(entitySetName: string, rawSchema: unknown): string {
    type RawEntitySet = { name: string; entityTypeName?: string; fullyQualifiedName?: string };
    const entitySets: RawEntitySet[] = (rawSchema as { schema: { entitySets: RawEntitySet[] } }).schema.entitySets;

    const directMatch = entitySets.find((es) => es.name === entitySetName);
    if (directMatch) {
        return directMatch.entityTypeName ?? directMatch.fullyQualifiedName ?? entitySetName;
    }

    // entitySetName is a nav property — resolve via the converted schema.
    const convertedSchema = convert(rawSchema as Parameters<typeof convert>[0]);
    const navTarget = convertedSchema.entitySets
        .flatMap((es) => es.entityType.navigationProperties)
        .find((nav) => nav.name === entitySetName);
    const targetEntitySet = navTarget
        ? convertedSchema.entitySets.find((es) => es.entityTypeName === navTarget.targetType.name)
        : undefined;
    return targetEntitySet?.entityTypeName ?? targetEntitySet?.name ?? entitySetName;
}
