import type { CreateServerConfig } from 'livereload';
import type { Options } from 'connect-livereload';

export type LiveReloadOptions = Omit<CreateServerConfig, 'version' | 'server'>;
export interface ConnectLivereloadOptions extends Options {
    disabled?: boolean;
}
export interface HttpsOptions {
    key?: string;
    cert?: string;
}

export interface ReloaderConfig extends LiveReloadOptions {
    path: string | string[];
    https?: HttpsOptions;
    connectOptions?: ConnectLivereloadOptions;
}
