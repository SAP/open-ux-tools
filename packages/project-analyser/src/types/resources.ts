export interface ManifestDocument {
    readonly path: string;
    readonly content: Record<string, unknown>;
}

export interface AnnotationDocument {
    readonly path: string;
    readonly format: 'xml' | 'json' | 'cds';
    readonly content: string;
}
