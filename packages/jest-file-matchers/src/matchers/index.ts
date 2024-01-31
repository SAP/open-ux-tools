import type { Filter, MatcherIgnore } from './types';

export { toContainAllFilesIn } from './toContainAllFilesIn';
export { toMatchFilesIn } from './toMatchFilesIn';
export { toMatchFolder } from './toMatchFolder';

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
