import type { ServeStaticConfig, PathConfig } from './types';
import type { ServeStaticOptions } from 'serve-static';
import { relative, isAbsolute, join } from 'path';

/**
 * Resolves the serve static options from a configuration object.
 *
 * @param options configuration object
 * @returns resolved serve static options
 */
export const resolveServeStaticOptions = (options: ServeStaticConfig | PathConfig): ServeStaticOptions => {
    return Object.fromEntries(
        Object.entries(options).filter(([key]) => {
            return key !== 'paths' && key !== 'setHeaders' && key !== 'src' && key !== 'path';
        })
    );
};

/**
 * If a relative src path is provided in the configuration, it is resolved based on the current working directory.
 *
 * @param rootPath path to the root folder of the project
 * @param srcPath path to the source folder from which to serve files
 * @returns path to the source folder from which to serve files
 */
export const resolveSrcPath = (rootPath: string, srcPath: string): string => {
    return isAbsolute(srcPath) ? srcPath : relative(process.cwd(), join(rootPath, srcPath));
};
