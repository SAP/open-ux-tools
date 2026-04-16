/* eslint-disable @typescript-eslint/no-namespace */
import type { Filter, MatcherIgnore } from './types.js';
export { toContainAllFilesIn } from './toContainAllFilesIn/index.js';
export { toMatchFilesIn } from './toMatchFilesIn/index.js';
export { toMatchFolder } from './toMatchFolder/index.js';

declare global {
    namespace jest {
        interface Matchers<R> {
            toMatchFolder: (expectedFolder: string, options?: Filter & MatcherIgnore) => R;
            toContainAllFilesIn: (expectedFolder: string, options?: Filter) => R;
            toMatchFilesIn: (expectedFolder: string, options?: Filter) => R;
        }

        interface Expect {
            toMatchFolder: (expectedFolder: string, options?: Filter & MatcherIgnore) => void;
            toContainAllFilesIn: (expectedFolder: string, options?: Filter) => void;
            toMatchFilesIn: (expectedFolder: string, options?: Filter) => void;
        }
    }
}
