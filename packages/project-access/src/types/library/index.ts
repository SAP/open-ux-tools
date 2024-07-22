export const enum ReuseLibType {
    Library = 'library',
    Component = 'component'
}

/**
 * Reuse library
 */
export interface ReuseLib {
    name: string;
    path: string;
    type: ReuseLibType;
    uri: string;
    dependencies: string[];
    libRoot: string;
    description?: string;
}
