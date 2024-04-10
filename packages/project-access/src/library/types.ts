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
}

/**
 * Choice for the reuse library
 */
export interface ReuseLibChoice {
    name: string;
    value: ReuseLib;
}
