import { create as createStorage } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { getXPathStringsForXmlFile } from '@sap-ux/fe-fpm-writer';
import type { GetFunctionalityDetailsInput, GetFunctionalityDetailsOutput } from '../../../types/index.js';
import { convertToSchema, resolveApplication, logger } from '../../../utils/index.js';
import { ADD_BUILDING_BLOCK } from '../../../constant.js';
import { buildBuildingBlockSchema } from './schema.js';
import {
    getViewAndFragmentPaths,
    aggregationChildTypeNames,
    buildingBlockTypeNames,
    annotationShellTermLabels,
    annotationShellTypeNames,
    versionRequirementsNote,
    aggregationParentMacroMappingNote,
    resolveBasePath
} from './utils.js';

/**
 * Tells the LLM where to find full property docs and which BB types have UI5 version constraints.
 * References bb_macro_api.md via the search_docs tool — keeps property semantics out of this file.
 */
const PROPERTY_DOCS_GUIDE =
    'Use search_docs with a building block type name (e.g. "FilterBar building block", "Table building block") ' +
    'to retrieve full property documentation from bb_macro_api.md before populating buildingBlockData. ' +
    `${versionRequirementsNote} ` +
    'RichTextEditor and RichTextEditorButtonGroups must be placed in a fragment file (custom section), NOT in a view file. ' +
    'If the app has no fragment files, tell the user: "RichTextEditor can only be added to a custom section fragment. Please create a custom section fragment first, then ask again." ' +
    'When adding RichTextEditorButtonGroups to a RichTextEditor that already has button groups, always call get_functionality_details again first to get the current aggregationPath — do not reuse a path from a previous call. ' +
    'Page building block must be placed in a custom page view file (.view.xml), NOT in a fragment file. ' +
    'If the app has no custom page view files, tell the user: "Page building block can only be added to a custom page view. Please create a custom page view first, then ask again." ' +
    'Only one macros:Page element is allowed per view. If a macros:Page already exists in the view, do NOT add another — instead add building blocks (e.g. Table, FilterBar) inside it using the XPath that points to the macros:Page items aggregation. ' +
    'When adding a Page building block, always use the XPath that is a direct child of /mvc:View as aggregationPath (e.g. /mvc:View/Page) — never use a deeper path like /mvc:View/Page/content.';

/**
 * Explains aggregation child placement: which types insert into a parent macro, how to pick
 * the aggregationPath, and how to express before/after positioning via anchor + placement.
 */
const AGGREGATION_CHILD_PLACEMENT_GUIDE =
    `Aggregation child types (${aggregationChildTypeNames}) ` +
    'insert into a parent macro aggregation — their aggregationPath must point to the parent macro element ' +
    `(${aggregationParentMacroMappingNote}). ` +
    'For aggregation children: if the user specifies a position (before/after a specific existing column/field), ' +
    'pass position as { anchor: "<existingElementKey>", placement: "Before"|"After" } — the anchor value is the key attribute of the existing element in the XML. ' +
    'Keys are always kebab-case derived from the label (e.g. label "Test Header" → key="test-header", label "Product Name" → key="product-name"), so you can derive the anchor from the label without reading the file. ' +
    'Otherwise omit position and the column/field is appended at the end.';

/**
 * Covers the four embededFragment + eventHandler combinations for CustomColumn, CustomFilterField,
 * and CustomFormField. The LLM must ask the user which case applies when it is unclear.
 */
const FRAGMENT_HANDLER_GUIDE =
    `Fragment and event handler options for aggregation children (${aggregationChildTypeNames}): ` +
    '(1) New fragment, no handler — omit embededFragment entirely; a new fragment file is created automatically. ' +
    '(2) New fragment, with handler — set embededFragment.eventHandler to true (auto-generates a standalone .js handler named after the fragment with a default onPress function) ' +
    'or { fileName: "MyHandler", fnName: "myFn" } (auto-generates a standalone .js handler with a specific name and function). ' +
    'Do NOT create handler files manually. ' +
    '(3) Existing fragment, no handler — set embededFragment.name to the existing fragment file name; no handler is generated. ' +
    '(4) Existing fragment, with handler — set embededFragment.name to the existing fragment file name and embededFragment.eventHandler to { fileName: "ExistingHandler", fnName: "myFn" }. ' +
    'Ask the user which case applies before calling execute_functionality if it is unclear.';

/**
 * Covers the three embeddedAction + eventHandler combinations for the Action BB type.
 * Case (2) requires a manual follow-up edit — the tool only wires the XML.
 */
const ACTION_HANDLER_GUIDE =
    'Action handler options: ' +
    '(1) New handler file, new function — set embeddedAction.eventHandler to { fileName: "MyHandler", fnName: "myFn" }. The tool creates the file automatically. ' +
    '(2) Existing handler file, new function — set embeddedAction.name to the existing file and embeddedAction.eventHandler to { fileName: "ExistingFile", fnName: "newFn" }. ' +
    'The tool wires the XML but does NOT append the function to the existing file. After execute_functionality, append the new function to the handler .js file. ' +
    '(3) Existing handler file, existing function — set embeddedAction.name to the existing file and embeddedAction.eventHandler to { fileName: "ExistingFile", fnName: "existingFn" }. ' +
    'The function already exists — no file editing needed.';

/**
 * Explains how to wire a FilterBar to a Table and the metaPath format rules for both.
 * metaPath is the only binding mechanism — contextPath must always be left unset.
 */
const FILTERBAR_WIRING_GUIDE =
    'FilterBar wiring: add the FilterBar first (note its id), then when adding the Table pass buildingBlockData.filterBar set to that id. ' +
    'If the Table already exists and needs linking, edit the view XML directly to add filterBar="<filterBarId>" to the macros:Table element. ' +
    'metaPath format for Table and FilterBar — never set contextPath, always leave it unset: ' +
    '(1) Relative binding (navigation property as value source, e.g. "to_Booking"): metaPath="<navProp>/@<annotation>#<qualifier>" — no leading slash. Example: metaPath="to_Booking/@com.sap.vocabularies.UI.v1.LineItem#tableMacro". ' +
    '(2) Absolute binding (entity set as value source, e.g. "Booking"): metaPath="/<entitySet>/@<annotation>#<qualifier>" — leading slash. Example: metaPath="/Booking/@com.sap.vocabularies.UI.v1.SelectionFields#filterBarMacro1".';

/**
 * Composed guidance note appended to ADD_BUILDING_BLOCK_FUNCTIONALITY.description.
 * Each section is a named constant above — edit the relevant one when rules change.
 */
const BB_TYPE_DOCS_NOTE = [
    PROPERTY_DOCS_GUIDE,
    AGGREGATION_CHILD_PLACEMENT_GUIDE,
    FRAGMENT_HANDLER_GUIDE,
    ACTION_HANDLER_GUIDE,
    FILTERBAR_WIRING_GUIDE
].join(' ');

/**
 * Functionality descriptor for adding a building block.
 */
export const ADD_BUILDING_BLOCK_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    functionalityId: ADD_BUILDING_BLOCK,
    name: 'Add a sap.fe.macros building block to a view or fragment',
    description:
        `Inserts a SAP Fiori elements building block (${buildingBlockTypeNames}, ` +
        `or an aggregation child: ${aggregationChildTypeNames}) ` +
        'into an existing view or fragment XML file. ' +
        `For ${annotationShellTypeNames}: the required annotation shell (${annotationShellTermLabels}) ` +
        'is written automatically to the app annotation file — you do NOT need to check or read the annotation file first. ' +
        'If the annotation already exists it will not be duplicated. ' +
        'Call execute_functionality exactly once per building block — do NOT retry or call it again after a successful result. ' +
        'If the user request is ambiguous (e.g. multiple elements of the same type exist at the same level — ' +
        'such as two macros:Table or two macros:FilterBar in the same parent — and the target is unclear), ' +
        'ask the user to clarify by id (e.g. "which table — Table or Table1?") before calling execute_functionality. ' +
        'Do NOT read any files to resolve ambiguity. ' +
        BB_TYPE_DOCS_NOTE,
    parameters: convertToSchema(buildBuildingBlockSchema())
};

/** Entry in the per-file XPath map built before returning functionality details. */
interface FileXPathEntry {
    /** Relative path from the app root to the view or fragment file. */
    file: string;
    /** Valid aggregation XPath strings that can be used as `aggregationPath`. */
    xpaths: string[];
}

/**
 * Builds a map of view/fragment file → valid aggregation XPath strings by
 * interrogating each file with `getXPathStringsForXmlFile`.
 *
 * Files that cannot be parsed are logged as warnings and skipped so a single
 * broken XML file never prevents the rest from being returned.
 *
 * @param viewFiles - Absolute paths to all view and fragment files in the app.
 * @param appPath - Absolute app root used to strip the path prefix from entries.
 * @param fs - mem-fs editor instance (files do not need to be read into it first).
 * @returns Array of `{ file, xpaths }` entries — only files with at least one valid XPath are included.
 * @example
 * const entries = buildFileXPathMap(viewFiles, '/projects/myapp', fs);
 * // [{ file: 'webapp/view/Main.view.xml', xpaths: ['/mvc:View/Page/content', ...] }]
 */
function buildFileXPathMap(
    viewFiles: string[],
    appPath: string,
    fs: ReturnType<typeof createEditor>
): FileXPathEntry[] {
    const result: FileXPathEntry[] = [];
    for (const file of viewFiles) {
        try {
            const { inputChoices } = getXPathStringsForXmlFile(file, fs);
            const xpaths = Object.values(inputChoices);
            if (xpaths.length > 0) {
                const relativePath = file.startsWith(appPath + '/') ? file.slice(appPath.length + 1) : file;
                result.push({ file: relativePath, xpaths });
            }
        } catch (e) {
            logger.warn(
                `[BB] buildFileXPathMap: failed to parse "${file}": ${e instanceof Error ? e.message : String(e)}`
            );
        }
    }
    return result;
}

/**
 * Formats the `fileXPathMap` that is appended to the
 * functionality description so the LLM knows exactly which files and XPaths are available.
 *
 * @param fileXPathMap - Output of `buildFileXPathMap`.
 * @param viewFiles - Full list of discovered view/fragment files (used for the fallback message).
 * @param appPath - Absolute app root used to strip the path prefix in the fallback message.
 * @returns A plain-text note ready to append to a functionality description.
 * @example
 * const note = formatInsertionPointsNote(entries, viewFiles, '/projects/myapp');
 * // 'Available insertion points (viewOrFragmentPath → aggregationPath options):\n  webapp/view/Main.view.xml:\n    - /mvc:View/...'
 */
function formatInsertionPointsNote(fileXPathMap: FileXPathEntry[], viewFiles: string[], appPath: string): string {
    if (fileXPathMap.length > 0) {
        return (
            'Available insertion points (viewOrFragmentPath → aggregationPath options):\n' +
            fileXPathMap
                .map(
                    ({ file, xpaths }) =>
                        `  ${file}:\n${xpaths
                            .slice(0, 10)
                            .map((x) => `    - ${x}`)
                            .join('\n')}`
                )
                .join('\n') +
            '\nUse these relative paths as viewOrFragmentPath and one of the listed XPaths as aggregationPath. Do NOT read any files or list directories.'
        );
    }
    if (viewFiles.length > 0) {
        const relativeFiles = viewFiles
            .map((f) => (f.startsWith(appPath + '/') ? f.slice(appPath.length + 1) : f))
            .join(', ');
        return `View/fragment files found but no XPaths could be parsed: ${relativeFiles}. Provide viewOrFragmentPath and aggregationPath manually.`;
    }
    return 'No view/fragment files found in the app — provide viewOrFragmentPath and aggregationPath manually.';
}

/**
 * Returns functionality details for adding a building block, enriched with the actual
 * view/fragment files and their valid XPath insertion points found in the app.
 *
 * The LLM calls this before execute_functionality so it knows exactly which files exist
 * and where it can insert — without having to read any files itself.
 *
 * @param input - The input parameters including the app path.
 * @returns Functionality details with available insertion points appended to the description.
 */
export async function getFunctionalityDetails(
    input: GetFunctionalityDetailsInput
): Promise<GetFunctionalityDetailsOutput> {
    const project = await resolveApplication(input.appPath);
    if (!project?.root) {
        return {
            ...ADD_BUILDING_BLOCK_FUNCTIONALITY,
            name: 'Invalid Project Root or Application Path',
            description: `To add a building block, provide a valid project root or application path. "${input.appPath}" is not valid.`
        };
    }

    const appPath = resolveBasePath(project);

    let viewFiles: string[] = [];
    let fs: ReturnType<typeof createEditor> | undefined;
    try {
        viewFiles = await getViewAndFragmentPaths(appPath);
        const store = createStorage();
        fs = createEditor(store);
    } catch (e) {
        logger.warn(
            `[BB] getFunctionalityDetails: failed to enumerate view/fragment files: ${e instanceof Error ? e.message : String(e)}`
        );
    }

    const fileXPathMap = fs ? buildFileXPathMap(viewFiles, appPath, fs) : [];
    const insertionPointsNote = formatInsertionPointsNote(fileXPathMap, viewFiles, appPath);

    return {
        ...ADD_BUILDING_BLOCK_FUNCTIONALITY,
        description: ADD_BUILDING_BLOCK_FUNCTIONALITY.description + '\n\n' + insertionPointsNote,
        parameters: convertToSchema(buildBuildingBlockSchema())
    };
}
