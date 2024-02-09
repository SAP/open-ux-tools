/**
 * Computes line offsets for the given string.
 *
 * @param text text
 * @returns array of number
 */
export function getLineOffsets(text: string): number[] {
    const lineOffsets: number[] = [0];
    for (let index = 0; index < text.length; ) {
        const character = text[index];
        if (character === '\n') {
            lineOffsets.push(index + 1);
            index++; // Increment index here
        } else if (character === '\r') {
            if (index + 1 < text.length && text[index + 1] === '\n') {
                index += 2; // Increment index by 2 when encountering '\r\n'
            } else {
                index++; // Increment index by 1 when encountering '\r'
            }
            lineOffsets.push(index); // Push the updated index value
        } else {
            index++; // Increment index if character is not a line break
        }
    }
    return lineOffsets;
}
