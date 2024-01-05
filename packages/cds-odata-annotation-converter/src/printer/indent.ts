const OPENING_CHARACTERS = new Set(['[', '{', '(']);
const CLOSING_CHARACTERS = new Set([']', '}', ')']);

/**
 *  Indent a string representing a complete element.
 *  Indentation is performed now after the element has completely been composed.
 *  The advantage is that the context is that the indentation level can be easily calculated.
 *  by counting opening and closing brackets.
 *  (The element 'string' must not contain any indentation when calling this method).
 *
 * @param string - String representing a complete element
 * @param indentInfo - indentation level, default 0 and skipFirstLine a boolean flag, flag to skip indenting first line if insert position is known.
 * @returns Indent a string representing a complete element.
 */
export function indent(
    string: string,
    indentInfo = {
        level: 0,
        skipFirstLine: false
    }
): string {
    let level = indentInfo.level;
    const parts = string.split('\n');
    for (let i = 0; i < parts.length; i++) {
        const line = parts[i];
        const change = indentChange(line);
        if (change < 0) {
            level += change;
        }
        if (indentInfo.skipFirstLine && i === 0) {
            level += change;
            continue;
        }
        if (level > 0) {
            parts[i] = indentLine(line, level);
        }
        if (change > 0) {
            level += change;
        }
    }
    return parts.join('\n');
}

/**
 * Indent a string containing a single line.
 *
 * @param string - The string to be indented.
 * @param level - The level of indentation (number of spaces per level).
 * @returns The indented string.
 */
function indentLine(string: string, level: number): string {
    const indent = '    ';
    return `${indent.repeat(level)}${string}`;
}

/**
 *
 * @param line - The line of code or text.
 * @returns The change in indentation level, positive for each opening character,
 *                  negative for each closing character.
 */
function indentChange(line: string): number {
    let change = 0;
    for (const character of line) {
        if (OPENING_CHARACTERS.has(character)) {
            change++;
        } else if (CLOSING_CHARACTERS.has(character)) {
            change--;
        }
    }
    return change;
}
