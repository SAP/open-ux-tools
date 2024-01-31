/// <reference types="jest" />

import type { DiffOptions } from 'jest-diff';

export interface FileMatcherOptions {
    diff?: DiffOptions;
}

declare global {
    namespace jest {
        interface Matchers<R> {
            toMatchFile: (filename?: string, options?: FileMatcherOptions) => R;
        }

        interface Expect {
            toMatchFile: (filename?: string, options?: FileMatcherOptions) => void;
        }
    }
}
