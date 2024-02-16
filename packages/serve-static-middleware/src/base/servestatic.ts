import { default as serveStatic } from 'serve-static';
import type { ServeStaticOptions } from 'serve-static';

/**
 * Function for serving static files.
 *
 * @param root - root directory from which to serve files
 * @param options - additional configuration options
 * @returns a middleware function to serve files
 */
export const serveStaticMiddleware = (root: string, options?: ServeStaticOptions) => {
    return serveStatic(root, options);
};
