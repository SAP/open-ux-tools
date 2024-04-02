export interface ReuseLibConfig {
    name: string;
    path: string;
    type: 'library' | 'component';
    uri: string;
}

export interface ServeStaticPath {
    path: string;
    src: string;
    fallthrough: boolean;
}
