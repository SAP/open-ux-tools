import type { CopyOptions, MemFsEditor as Editor } from 'mem-fs-editor';
import type { TabInfo } from '../common/types';

const CHAR_SPACE = ' ';
const CHAR_TAB = '\t';

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
        const content = fs.read(filePath) ?? '';
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
 */
export function copyTpl(fs: Editor, from: string, to: string, context?: object): void {
    fs.copyTpl(from, to, context, undefined, COPY_TEMPLATE_OPTIONS);
}
