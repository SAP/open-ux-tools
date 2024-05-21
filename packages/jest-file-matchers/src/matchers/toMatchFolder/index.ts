import { toContainAllFilesIn } from '../toContainAllFilesIn';
import { toMatchFilesIn } from '../toMatchFilesIn';
import type { MatcherOptions } from '../types';
import { extractMessage } from '../utils';

/**
 * Matcher to assert that the files and file content match are the same in `receivedFolder` and `expectedFolder`.
 *
 * @param receivedFolder path to received folder
 * @param expectedFolder path to expected folder
 * @param options additional options for matching
 * @returns results for custom matcher
 */
export function toMatchFolder(
    receivedFolder: string,
    expectedFolder: string,
    options?: MatcherOptions
): jest.CustomMatcherResult {
    const messages: string[] = [];
    let pass = true;

    const matchers = [toContainAllFilesIn, toMatchFilesIn];

    for (const matcher of matchers) {
        const { pass: matcherPass, message: getMessage } = matcher.bind(this)(receivedFolder, expectedFolder, options);
        pass = pass && matcherPass;
        extractMessage({ getMessage, messages });
    }

    return { pass, message: () => messages.join('\n') };
}
