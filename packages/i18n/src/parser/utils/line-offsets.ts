/**
 * Computes line offsets for the given string.
 *
 * @param text text
 * @returns array of number
 */
export function getLineOffsets(text: string): number[] {
    const lineOffsets: number[] = [0];
    for (let index = 0; index < text.length; index++) {
        const character = text[index];
        if (character === '\n') {
            lineOffsets.push(index + 1);
        } else if (character === '\r') {
            if (index + 1 < text.length && text[index + 1] === '\n') {
                index++;
            }
            lineOffsets.push(index + 1);
        }
    }
    return lineOffsets;
}
