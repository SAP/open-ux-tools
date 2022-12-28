import type { Editor } from 'mem-fs-editor';
import type { TabInfo } from '../common/types';

const CHAR_SPACE = ' ';
const CHAR_TAB = '\t';

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
    const symbol = line[0] === CHAR_TAB ? CHAR_TAB : CHAR_SPACE;
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
    const tabSymbols = [CHAR_SPACE, CHAR_TAB];
    const lines = content.split(/\r\n|\n/);
    const lineWithSpacing = lines.find((line: string): boolean => {
        return tabSymbols.includes(line[0]);
    });
    if (lineWithSpacing) {
        tabSize = getLineTabInfo(lineWithSpacing);
    }
    return tabSize;
}

/**
 * Method calculates tab spacing parameter for JSON parse.
 *
 * @param content - file content.
 * @param tabInfo - External tab configuration.
 * @returns tab size information.
 */
export function getJsonSpace(content: string, tabInfo?: TabInfo | undefined): WriteJsonSpace | undefined {
    let space: WriteJsonSpace | undefined;
    // Use passed tab info or read from existing content
    tabInfo = tabInfo || detectTabSpacing(content);
    if (tabInfo !== undefined) {
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
    const space: WriteJsonSpace | undefined = getJsonSpace(params.content, params.tabInfo);
    // Write json
    fs.extendJSON(filepath, JSON.parse(content), replacer, space);
}
