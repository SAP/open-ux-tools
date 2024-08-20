/**
 * Determine if the current prompting environment is cli .
 *
 * @returns true if it is a cli environment, false otherwise
 */
export function isCli(): boolean {
    if (process.argv[1]?.includes('yo') || process.stdin.isTTY) {
        return true;
    } else {
        return false;
    }
}
