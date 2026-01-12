import type { CopyOptions } from 'mem-fs-editor';

// `noGlob` is supported in `mem-fs-editor` v9,
// but is missing from `@types/mem-fs-editor` (no v9 typings), so we extend the type here.
export const CopyTemplateOptions: CopyOptions & { noGlob: boolean } = {
    noGlob: true
};
