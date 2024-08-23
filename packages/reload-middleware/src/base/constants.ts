import type { LiveReloadOptions, ConnectLivereloadOptions } from './types';

export const defaultLiveReloadOpts: LiveReloadOptions = {
    exts: [
        'html',
        'js',
        'ts',
        'json',
        'xml',
        'properties',
        'change',
        'variant',
        'appdescr_variant',
        'ctrl_variant',
        'ctrl_variant_change',
        'ctrl_variant_management_change'
    ]
};

export const defaultConnectLivereloadOpts: ConnectLivereloadOptions = {
    port: 35729,
    include: ['.html']
};
