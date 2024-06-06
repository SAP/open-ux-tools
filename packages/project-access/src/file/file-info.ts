import { JSONFileInfo } from "../types";

type WriteJsonSpace = number | string;
const CHAR_SPACE = ' ';
const CHAR_TAB = '\t';

/**
 * Method calculates tab spacing parameter for 'JSON.stringify' method.
 *
 * @param tabInfo - External tab configuration.
 * @returns tab size information.
 */
export function getJsonSpace(tabInfo: JSONFileInfo): WriteJsonSpace | undefined {
    let space: WriteJsonSpace | undefined;
    // 'tabInfo' exists - it was passed as custom configuration or calculated from target file
    if (tabInfo.useTabSymbol) {
        // Tab symbol should be used as tab
        space = CHAR_TAB.repeat(tabInfo.size ?? 1);
    } else {
        // Spaces should be used as tab
        space = tabInfo.size;
    }
    return space;
}

/**
 * Method returns tab info for passed line.
 *
 * @param line - line with tab spacing
 * @returns tab size information
 */
function getLineTabInfo(line: string): JSONFileInfo {
    let tabSize: JSONFileInfo = {};
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
export function getJSONFileInfo(content: string): JSONFileInfo {
    // Detect tab size information
    let fileInfo: JSONFileInfo | undefined = {};
    const tabSymbols = [CHAR_SPACE, CHAR_TAB];
    const lines = content.split(/\r\n|\n/);
    const lineWithSpacing = lines.find((line: string): boolean => {
        return tabSymbols.includes(line[0]);
    });
    if (lineWithSpacing) {
        fileInfo = getLineTabInfo(lineWithSpacing);
    }
    // Detect end lines at the end of content
    let endOfFile = '';
    if (lines.length > 1) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (!lines[i]) {
                endOfFile = `${lines[i]}\n${endOfFile}`;
            }
        }
    }
    if (endOfFile) {
        fileInfo.eof = endOfFile;
    }
    return fileInfo;
}
