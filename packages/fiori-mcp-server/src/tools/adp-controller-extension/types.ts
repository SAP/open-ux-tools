/**
 * A file extracted from an AI response: the requested write path and its
 * source code. The `path` may be absolute or relative — the writer is
 * responsible for normalising and sandboxing it.
 */
export interface ExtractedFile {
    path: string;
    code: string;
}

/**
 * A file already present in the adaptation project, surfaced to the model so
 * it can extend existing controller extensions and fragments instead of
 * creating duplicates.
 */
export interface ExistingProjectFile {
    relativePath: string;
    content: string;
}

/**
 * Subset of `manifest.appdescr_variant` that affects controller-extension and
 * fragment generation.
 */
export interface ProjectContext {
    layer: string;
    variantId: string;
    projectFolderName: string;
}
