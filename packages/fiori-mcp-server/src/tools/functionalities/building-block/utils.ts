import {
    BuildingBlockType,
    getFragmentAndViewFiles,
    MIN_UI5_VERSION_RICH_TEXT_EDITOR,
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK,
    MIN_UI5_VERSION_PAGE_BUILDING_BLOCK_FULL_LAYOUT
} from '@sap-ux/fe-fpm-writer';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI.js';
import { create } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { isAbsolute, join, relative, resolve } from 'node:path';
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
    const appAccess = project.applicationAccess as { project: { root: string } } | undefined;
    return appAccess ? join(appAccess.project.root, project.appId) : project.root;
}

/**
 * Returns `file` as a POSIX-style path relative to `appPath` when it lives inside the app,
 * otherwise returns `file` unchanged.
 *
 * File enumeration yields OS-native separators (backslashes on Windows) while `appPath` may use a
 * different separator, so a direct `startsWith(appPath + '/')` check fails on Windows and leaves the
 * path absolute. Both sides are normalized to forward slashes before the prefix is stripped, so the
 * comparison — and the returned path shown to the LLM — are correct on every platform.
 *
 * @param appPath - Absolute application base path
 * @param file - Absolute file path discovered under the app
 * @returns POSIX-style path relative to `appPath` when inside the app, else the original `file`
 */
export function toAppRelativePath(appPath: string, file: string): string {
    const appPosix = appPath.replaceAll('\\', '/');
    const filePosix = file.replaceAll('\\', '/');
    return filePosix.startsWith(appPosix + '/') ? filePosix.slice(appPosix.length + 1) : file;
}

/**
 * Resolves a client-supplied view/fragment path against the app base and returns a POSIX-style path
 * relative to that base, but only when it stays inside the base. `viewOrFragmentPath` is LLM-supplied,
 * so an absolute path or `../` segments could otherwise point generateBuildingBlock at a file outside
 * the app. Returns undefined when the resolved path escapes the base.
 *
 * The returned value is reconstructed as `relative(resolve(basePath), resolved)` with backslashes
 * normalized to forward slashes — this avoids a Windows drive-letter prefix that `resolve()` prepends
 * to a POSIX-style path (e.g. `/app` → `D:\app` on Windows) and keeps the path relative so
 * generateBuildingBlock can join it with the base.
 *
 * @param basePath - Absolute application base path (the generateBuildingBlock basePath)
 * @param viewOrFragmentPath - Client-supplied view/fragment path (absolute or relative to basePath)
 * @returns A POSIX-style path relative to basePath, or undefined when it escapes the base
 */
export function resolveWithinApp(basePath: string, viewOrFragmentPath: string): string | undefined {
    const root = resolve(basePath);
    const resolved = isAbsolute(viewOrFragmentPath) ? resolve(viewOrFragmentPath) : resolve(root, viewOrFragmentPath);
    const rel = relative(root, resolved);
    if (rel.startsWith('..') || isAbsolute(rel)) {
        return undefined;
    }
    return rel.replaceAll('\\', '/');
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
 * Returns all view and fragment XML file paths for a Fiori app.
 *
 * @param appPath - Absolute path to the Fiori app root
 * @returns Array of absolute paths to .view.xml and .fragment.xml files
 */
export function getViewAndFragmentPaths(appPath: string): Promise<string[]> {
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
 * @param value - kebab-case BuildingBlockType value
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
 * Shared between annotations.ts (writes the shell) and get-functionality-details.ts (describes it).
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
 * Maps each BB type that has a hard minimum UI5 version gate in @sap-ux/fe-fpm-writer to its requirement.
 * Only RichTextEditor(/ButtonGroups) and Page are gated in the writer — every other building block type
 * has no minimum version enforced there, so no invented floor is listed for them. Thresholds are imported
 * as real constants from the writer so they can never drift from the actual gates.
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
 * Human-readable note listing the UI5 version constraints. The per-version groups are derived entirely
 * from BB_TYPE_MIN_UI5_VERSION so they can never drift from the actual writer gates. Only RichTextEditor
 * and Page have real minimums; the trailing sentences state the universal OData V4 requirement, that the
 * remaining types have no specific minimum, and Chart's contextPath behaviour below 1.97.
 */
export const versionRequirementsNote: string = (() => {
    const byVersion = new Map<string, string[]>();
    for (const [type, requirement] of Object.entries(BB_TYPE_MIN_UI5_VERSION) as [
        BuildingBlockType,
        BbTypeVersionRequirement
    ][]) {
        const displayName = toDisplayName(type);

        const basicEntries = byVersion.get(requirement.minVersion) ?? [];
        basicEntries.push(requirement.fullLayoutVersion ? `${displayName} (basic)` : displayName);
        byVersion.set(requirement.minVersion, basicEntries);

        if (requirement.fullLayoutVersion) {
            const fullEntries = byVersion.get(requirement.fullLayoutVersion) ?? [];
            fullEntries.push(`${displayName} (full layout)`);
            byVersion.set(requirement.fullLayoutVersion, fullEntries);
        }
    }
    const versionGroups = [...byVersion.entries()]
        .map(([version, types]) => `Types requiring UI5 >= ${version}: ${types.join(', ')}.`)
        .join(' ');
    return (
        `${versionGroups} ` +
        'All building blocks require an OData V4 service. ' +
        'Other building block types (Table, Chart, FilterBar, Field, Form, CustomColumn, CustomFilterField, ' +
        'CustomFormField, Action) have no specific minimum UI5 version beyond the application baseline. ' +
        'Chart: on UI5 < 1.97 the chart is always generated with contextPath applied.'
    );
})();
