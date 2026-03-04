import type { CopyOptions, Editor } from 'mem-fs-editor';
import type { TabInfo } from '../common/types';
import { sep, normalize } from 'node:path';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import { isElementIdAvailable } from '../building-block/prompts/utils';

const CHAR_SPACE = ' ';
const CHAR_TAB = '\t';
interface ButtonGroup {
    name: string;
    buttons: string[];
    visible?: boolean;
    priority?: number;
    customToolbarPriority?: number;
    row?: number;
    id?: string;
}
export type IdGeneratorFunction = (baseId: string, validatedIds?: string[]) => string;
interface TemplateContext {
    buttonGroups?: ButtonGroup[];
    name?: string;
    data?: {
        buttonGroups?: ButtonGroup[];
    };
}
export const CONFIG = {
    ['page/custom/1.94/ext/View.xml']: {
        getData: (generateId: IdGeneratorFunction, context?: TemplateContext): { ids: Record<string, string> } => {
            return {
                ids: {
                    page: generateId(context?.name ?? 'Page')
                }
            };
        }
    },
    ['page/custom/1.84/ext/View.xml']: {
        getData: (generateId: IdGeneratorFunction, context?: TemplateContext): { ids: Record<string, string> } => {
            return {
                ids: {
                    page: generateId(context?.name ?? 'Page')
                }
            };
        }
    },
    ['common/FragmentWithForm.xml']: {
        getData: (generateId: IdGeneratorFunction): { ids: Record<string, string> } => {
            return {
                ids: {
                    formElement: generateId('FormElement')
                }
            };
        }
    },
    ['common/FragmentWithVBox.xml']: {
        getData: (generateId: IdGeneratorFunction): { ids: Record<string, string> } => {
            return {
                ids: {
                    vbox: generateId('VBox')
                }
            };
        }
    },
    ['view/ext/CustomViewWithTable.xml']: {
        getData: (generateId: IdGeneratorFunction): { ids: Record<string, string> } => {
            return {
                ids: {
                    table: generateId('Table')
                }
            };
        }
    },
    ['filter/fragment.xml']: {
        getData: (generateId: IdGeneratorFunction): { ids: Record<string, string> } => {
            const item1 = generateId('Item');
            const item2 = generateId('Item', [item1]);
            const item3 = generateId('Item', [item1, item2]);
            return {
                ids: {
                    comboBox: generateId('ComboBox'),
                    item1,
                    item2,
                    item3
                }
            };
        }
    },
    ['building-block/rich-text-editor-button-groups/View.xml']: {
        getData: (generateId: IdGeneratorFunction, context?: TemplateContext): { ids: Record<string, string> } => {
            // Get buttonGroups from context
            const buttonGroups = context?.buttonGroups || context?.data?.buttonGroups || [];

            // Generate IDs for each button group and store in ids object
            const ids: Record<string, string> = {};
            const validatedIds: string[] = [];
            buttonGroups.forEach((group, index) => {
                const id = generateId(`${'ButtonGroup'}`, validatedIds);
                ids[index] = group.id ?? id;
                if (!group.id) {
                    validatedIds.push(id);
                }
            });

            return { ids };
        }
    }
};

/**
 * Generates a unique element ID that is not already used in any view or fragment file.
 * Uses an incremental counter for predictable, readable IDs.
 *
 * @param fs - The file system object for reading files
 * @param baseId - The base name for the ID (e.g., 'filterBar', 'chart')
 * @param filteredFiles - The list of files to check for ID availability
 * @param validatedIds - A list of IDs that have already been validated in the current session to avoid duplicates
 * @returns A unique ID that is available across all view and fragment files
 */
function generateUniqueElementId(
    fs: Editor,
    baseId: string,
    filteredFiles: string[],
    validatedIds: string[] = []
): string {
    const maxAttempts = 1000;

    if (filteredFiles.every((file) => isElementIdAvailable(fs, file, baseId)) && !validatedIds.includes(baseId)) {
        return baseId;
    }

    for (let counter = 1; counter < maxAttempts; counter++) {
        const candidateId = `${baseId}${counter}`;

        if (
            filteredFiles.every((file) => isElementIdAvailable(fs, file, candidateId)) &&
            !validatedIds.includes(candidateId)
        ) {
            return candidateId;
        }
    }

    // If we couldn't find an available ID after maxAttempts
    throw new Error(`Failed to generate unique ID for base '${baseId}' after ${maxAttempts} attempts`);
}

/**
 * Retrieves all view and fragment files in the application.
 *
 * @param appPath - The root path of the application
 * @param fs - The file system object for reading files
 * @returns A list of view and fragment files
 */
export async function getFragmentAndViewFiles(appPath: string, fs: Editor): Promise<string[]> {
    const files = await findFilesByExtension(
        '.xml',
        appPath,
        ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
        fs
    );

    const lookupFiles = ['.fragment.xml', '.view.xml'];
    return files.filter((fileName) => lookupFiles.some((lookupFile) => fileName.endsWith(lookupFile)));
}

/**
 * Creates an ID generator function for a given base path and editor.
 * The generator ensures unique IDs across all fragment and view files in the project.
 *
 * @param basePath - Base path of the project
 * @param fsEditor - mem-fs-editor instance
 * @returns A function that generates unique IDs based on a base ID string
 */
export async function createIdGenerator(
    basePath: string | undefined,
    fsEditor: Editor
): Promise<(baseId: string) => string> {
    let files: string[] = [];
    if (basePath) {
        files = await getFragmentAndViewFiles(basePath, fsEditor);
    }

    return (baseId: string, validatedIds: string[] = []): string => {
        return generateUniqueElementId(fsEditor, baseId, files, validatedIds);
    };
}

// `noGlob` is supported in `mem-fs-editor` v9,
// but is missing from `@types/mem-fs-editor` (no v9 typings), so we extend the type here.
export const COPY_TEMPLATE_OPTIONS: CopyOptions & { noGlob: boolean } = {
    noGlob: true
};

type WriteJsonReplacer = ((key: string, value: any) => any) | Array<string | number>;

type WriteJsonSpace = number | string;
interface ExtendJsonParams {
    filepath: string;
    content: string;
    replacer?: WriteJsonReplacer;
    tabInfo?: TabInfo;
}

/**
 * Method returns tab info for passed line.
 *
 * @param line - line with tab spacing
 * @returns tab size information
 */
function getLineTabInfo(line: string): TabInfo | undefined {
    let tabSize: TabInfo | undefined;
    const symbol = line.startsWith(CHAR_TAB) ? CHAR_TAB : CHAR_SPACE;
    // get count of tabs
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char !== symbol) {
            tabSize = {
                size: i,
                useTabSymbol: symbol === CHAR_TAB
            };
            break;
        }
    }
    return tabSize;
}

/**
 * Method calculates tab space info for passed file content.
 *
 * @param content - file content.
 * @returns tab size information.
 */
export function detectTabSpacing(content: string): TabInfo | undefined {
    let tabSize: TabInfo | undefined;
    const tabSymbols = new Set([CHAR_SPACE, CHAR_TAB]);
    const lines = content.split(/\r\n|\n/);
    const lineWithSpacing = lines.find((line: string): boolean => {
        return tabSymbols.has(line[0]);
    });
    if (lineWithSpacing) {
        tabSize = getLineTabInfo(lineWithSpacing);
    }
    return tabSize;
}

/**
 * Method calculates tab spacing parameter for 'JSON.stringify' method.
 *
 * @param fs - the mem-fs editor instance.
 * @param filePath - path to file to read.
 * @param tabInfo - External tab configuration.
 * @returns tab size information.
 */
export function getJsonSpace(fs: Editor, filePath: string, tabInfo?: TabInfo | undefined): WriteJsonSpace | undefined {
    if (!tabInfo) {
        // 'tabInfo'  was not passed - calculate 'tabInfo' by checking existing content of target file
        const content = fs.read(filePath);
        tabInfo = detectTabSpacing(content);
    }
    let space: WriteJsonSpace | undefined;
    if (tabInfo) {
        // 'tabInfo' exists - it was passed as custom configuration or calculated from target file
        if (tabInfo.useTabSymbol) {
            // Tab symbol should be used as tab
            space = CHAR_TAB.repeat(tabInfo.size || 1);
        } else {
            // Spaces should be used as tab
            space = tabInfo.size;
        }
    }
    return space;
}

/**
 * Method extends target JSON file with passed JSOn content.
 * Method uses 'fs.extendJSON', but applies additional calculation to reuse existing content tab sizing information.
 *
 * @param fs - the mem-fs editor instance.
 * @param params - options for JSON extend.
 */
export function extendJSON(fs: Editor, params: ExtendJsonParams): void {
    const { filepath, content, replacer } = params;
    const space: WriteJsonSpace | undefined = getJsonSpace(fs, filepath, params.tabInfo);
    // Write json
    fs.extendJSON(filepath, JSON.parse(content), replacer, space);
}

/**
 * Copies a template file or directory to a target location and applies template interpolation.
 * This method wraps `mem-fs-editor`'s `copyTpl` and passes predefined copy options
 * (e.g. `noGlob: true`) to prevent glob pattern expansion in source paths.
 *
 * @param fs - The mem-fs editor instance used to perform the file operations.
 * @param from - Source path of the template file or directory.
 * @param to - Destination path where the rendered files will be written.
 * @param context - Optional template context used for interpolation.
 * @param {(baseId: string) => string} generateId - Function to generate unique IDs for the building block elements.
 */
export function copyTpl(
    fs: Editor,
    from: string,
    to: string,
    context?: object,
    generateId?: (baseId: string) => string
): void {
    const configKey = getRelativeTemplateComponentPath(from);
    const config = CONFIG[configKey as keyof typeof CONFIG];
    if (generateId && config?.getData) {
        const additionalContext = config.getData(generateId, context);
        context = { ...context, ...additionalContext };
    }
    fs.copyTpl(from, to, context, undefined, COPY_TEMPLATE_OPTIONS);
}

/**
 * Extracts the relative path from the templates directory.
 * Works cross-platform by normalizing path separators.
 *
 * @param absolutePath - Absolute path to a template file or directory
 * @returns Relative path from templates directory with forward slashes, or original path if 'templates' not found
 */
export function getRelativeTemplateComponentPath(absolutePath: string): string {
    const normalizedPath = normalize(absolutePath);
    const templatesMarker = `${sep}templates${sep}`;

    const templatesIndex = normalizedPath.indexOf(templatesMarker);

    if (templatesIndex === -1) {
        return absolutePath;
    }

    // Extract everything after '/templates/' or '\\templates\\'
    const relativePath = normalizedPath.substring(templatesIndex + templatesMarker.length);

    // Normalize to forward slashes for consistency
    return relativePath.split(sep).join('/');
}
