/**
 * Position in a text document expressed as zero-based line and character offset.
 * The offsets are based on a UTF-16 string representation. So a string of the form
 * `a𐐀b` the character offset of the character `a` is 0, the character offset of `𐐀`
 * is 1 and the character offset of b is 3 since `𐐀` is represented using two code
 * units in UTF-16.
 *
 * Positions are line end character agnostic. So you can not specify a position that
 * denotes `\r|\n` or `\n|` where `|` represents the character offset.
 *
 * @Note copied from: node_modules\vscode-languageserver-types\lib\umd\main.d.ts. To keep source code lightweight since it depends only on `Range`
 */
export interface Position {
    /**
     * Line position in a document (zero-based).
     * If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
     * If a line number is negative, it defaults to 0.
     */
    line: number;
    /**
     * Character offset on a line in a document (zero-based). Assuming that the line is
     * represented as a string, the `character` value represents the gap between the
     * `character` and `character + 1`.
     *
     * If the character value is greater than the line length it defaults back to the
     * line length.
     * If a line number is negative, it defaults to 0.
     */
    character: number;
}
export const Position = {
    create(line: number, character: number): Position {
        return {
            line,
            character
        };
    }
};


/**
 *
 * @param lineOffsets Array of indices with line start offsets.
 * e.g [0] represents a document with one line that starts at offset 0.
 * @param offset
 * @param textLength
 */
export function positionAt(lineOffsets: number[], offset: number, textLength: number): Position {
    const target = Math.max(Math.min(offset, textLength), 0);
    let low = 0;
    let high = lineOffsets.length;

    if (high === 0) {
        return Position.create(0, target);
    }

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (lineOffsets[mid] > target) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    const line = low - 1;
    return Position.create(line, target - lineOffsets[line]);
}