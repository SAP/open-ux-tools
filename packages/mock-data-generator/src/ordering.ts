/**
 * Compare two strings by UTF-16 code unit, independent of the host locale. Use it for every order
 * that reaches generated output, fingerprints or files, so results are identical on every machine.
 *
 * @param left first string
 * @param right second string
 * @returns a negative number, zero or a positive number, as `Array.prototype.sort` expects
 * @example
 * ['apple', 'Banana'].sort(compareCodePoints); // ['Banana', 'apple']
 */
export function compareCodePoints(left: string, right: string): number {
    if (left < right) {
        return -1;
    }
    return left > right ? 1 : 0;
}
