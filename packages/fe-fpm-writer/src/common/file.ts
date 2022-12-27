import type { Editor } from 'mem-fs-editor';
import type { TabSizeInfo } from './types';
import { CHAR_SPACE, CHAR_TAB } from './types';

/**
 * Method returns tab info for passed line.
 * @param {string} line Line with tab spacing.
 * @returns {TabSizeInfo | undefined} Tab size information.
 */
function getLineTabInfo(line: string): TabSizeInfo | undefined {
    let tabSize: TabSizeInfo | undefined;
    const symbol = line[0] === CHAR_TAB ? CHAR_TAB : CHAR_SPACE;
    // get count of tabs
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char !== symbol) {
            tabSize = {
                size: i,
                symbol: symbol
            };
            break;
        }
    }
    return tabSize;
}

/**
 * Method calculates tab space info for passed file content.
 * @param {string} content File content.
 * @returns {TabSizeInfo | undefined} Tab size information.
 */
export function detectTabSpacing(content: string): TabSizeInfo | undefined {
    let tabSize: TabSizeInfo | undefined = {
        size: 0,
        symbol: CHAR_SPACE
    };
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

type WriteJsonReplacer = ((key: string, value: any) => any) | Array<string | number>;

type WriteJsonSpace = number | string;
interface ExtendJsonParams {
    filepath: string;
    content: string;
    replacer?: WriteJsonReplacer;
    space?: WriteJsonSpace;
}

export function extendJSON(fs: Editor, params: ExtendJsonParams): void {
    const { filepath, content, replacer, space } = params;
    fs.extendJSON(filepath, JSON.parse(content), replacer, space);
}
