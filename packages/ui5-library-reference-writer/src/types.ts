export const enum ReuseLibType {
    Library = 'library',
    Component = 'component'
}

export interface ReuseLib {
    name: string;
    path: string;
    type: ReuseLibType;
    uri: string;
    dependencies?: string[];
    libRoot?: string;
}

export interface ServeStaticPath {
    path: string;
    src: string;
    fallthrough: boolean;
}
