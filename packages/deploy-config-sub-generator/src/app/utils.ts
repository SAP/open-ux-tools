import type { DeployConfigOptions } from '../types';

/**
 * Parses the target from the CLI args or the options.
 *
 * @param args - cli args
 * @param opts - options
 * @returns - the target
 */
export function parseTarget(args: string | string[], opts: DeployConfigOptions): string | undefined {
    let result: string | undefined;
    if (typeof args === 'string') {
        result = args;
    } else if (Array.isArray(args)) {
        result = args?.[0];
    }
    if (!result) {
        result = opts.target;
    }
    return result;
}
