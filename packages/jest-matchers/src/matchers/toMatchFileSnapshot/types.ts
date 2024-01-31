/// <reference types="jest" />

import type { DiffOptions } from 'jest-diff';

export interface FileMatcherOptions {
    diff?: DiffOptions;
}

declare global {
    namespace jest {
        interface Matchers<R, T> {
            toMatchFile: (filename?: string, options?: FileMatcherOptions) => void;
        }

        interface Expect {
            toMatchFile: (filename?: string, options?: FileMatcherOptions) => void;
        }
    }
}
