import type { ServeStaticOptions } from 'serve-static';

export interface PathConfig extends ServeStaticOptions {
    path: string;
    src: string;
}

export interface ServeStaticPathConfig {
    paths: PathConfig[];
}

export type ServeStaticConfig = ServeStaticPathConfig & ServeStaticOptions;
