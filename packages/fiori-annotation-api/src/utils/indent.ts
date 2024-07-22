/**
 *  Increases indentation of the given multi line text value.
 *
 * @param text - Input value.
 * @param level - Indentation level.
 * @param skipFirstLine - Flag if the first line should remain unchanged.
 * @returns Indented value.
 */
export function increaseIndent(text: string, level = 0, skipFirstLine = false): string {
    if (level === 0) {
        return text;
    }
    const parts = text.split('\n');
    const indent = '    ';
    for (let i = skipFirstLine ? 1 : 0; i < parts.length; i++) {
        const line = parts[i];
        parts[i] = indentLine(indent, level, line);
    }

    return parts.join('\n');
}

/**
 *  Indents a value to the given level.
 *
 * @param indent Indent character(s).
 * @param level Indent level.
 * @param string Value that will be indented.
 * @returns Indented value.
 */
function indentLine(indent: string, level: number, string: string): string {
    return `${indent.repeat(level)}${string}`;
}
