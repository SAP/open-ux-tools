/**
 * Computes line offsets for the given string.
 *
 * @param text
 * @returns
 */
export function getLineOffsets(text: string): number[] {
    const lineOffsets: number[] = [0];
    let index = 0;
    while (index < text.length) {
        const match = text.substr(index).match(/[\r\n]/);
        if (match?.index !== undefined) {
            index += match.index + 1;
            if (text[index - 1] === '\r' && text[index] === '\n') {
                index++;
            }
            lineOffsets.push(index);
        } else {
            break;
        }
    }
    return lineOffsets;
}
