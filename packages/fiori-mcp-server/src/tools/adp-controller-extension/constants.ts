/**
 * Extensions of files that the project scanner reads back into the
 * knowledge-base response. Anything else is ignored.
 */
export const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set(['.js', '.ts', '.xml', '.json']);

/**
 * Per-file byte cap when scanning the project. Files larger than this are
 * skipped to keep the prompt context tidy.
 */
export const MAX_SCANNED_FILE_SIZE = 50 * 1024;
