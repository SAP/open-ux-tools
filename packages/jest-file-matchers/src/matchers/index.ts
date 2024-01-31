import type { Filter, MatcherIgnore } from './types';

export { toContainAllFilesIn } from './toContainAllFilesIn';
export { toMatchFilesIn } from './toMatchFilesIn';
export { toMatchFolder } from './toMatchFolder';

declare global {
    namespace jest {
        interface Matchers<R, T> {
            toMatchFolder: (expectedFolder: string, options?: Filter & MatcherIgnore) => void;
            toContainAllFilesIn: (expectedFolder: string, options?: Filter) => void;
            toMatchFilesIn: (expectedFolder: string, options?: Filter) => void;
        }

        interface Expect {
            toMatchFolder: (expectedFolder: string, options?: Filter & MatcherIgnore) => void;
            toContainAllFilesIn: (expectedFolder: string, options?: Filter) => void;
            toMatchFilesIn: (expectedFolder: string, options?: Filter) => void;
        }
    }
}
