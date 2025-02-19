export type Finder = {
    on: (type: FinderType, handler: FinderHandler<FinderType>) => {};
};

type FinderType = 'directory' | 'file' | 'end' | 'link' | 'error' | 'stop' | 'readlink' | 'path';

type FinderHandler<T> = T extends 'directory'
    ? (dir: string, stat: unknown, stop: () => void, linkPath: string) => void
    : T extends 'file'
    ? (file: string, stat: unknown, linkPath: string) => void
    : T extends 'end'
    ? () => void
    : T extends 'link'
    ? (link: string, stat: unknown) => void
    : T extends 'error'
    ? (error: Error) => void
    : T extends 'stop'
    ? () => void
    : T extends 'readlink'
    ? (src: string, dst: string) => void
    : T extends 'path'
    ? (file: unknown, stat: unknown, linkPath: string) => void
    : never;
