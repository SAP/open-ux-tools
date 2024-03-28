export const enum ReuseLibType {
    Library = 'library',
    Component = 'component'
}

export interface ReuseLib {
    name: string;
    path: string;
    type: ReuseLibType;
    uri: string;
}

export interface ServeStaticPath {
    path: string;
    src: string;
    fallthrough: boolean;
}
