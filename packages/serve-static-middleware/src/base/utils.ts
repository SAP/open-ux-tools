import type { ServeStaticConfig, PathConfig } from './types';
import type { ServeStaticOptions } from 'serve-static';
import { relative, isAbsolute, join } from 'path';

/**
 * Resolves the serve static options from the yaml configuration.
 * The properties 'paths', src', and 'path' are removed from the configuration object, as they are not part of the serve static options.
 * The property setHeaders is also removed, because it is not supported (can not be set in yaml files).
 *
 * @param options configuration object
 * @returns serve static options (https://www.npmjs.com/package/serve-static#options)
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
