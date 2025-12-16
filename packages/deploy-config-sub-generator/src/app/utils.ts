import { basename } from 'node:path';
import type { DeployConfigOptions } from '../types';
import type { GeneratorOptions } from 'yeoman-generator';

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

/**
 * Returns the details for the YUI prompt.
 *
 * @param appRootPath - path to the application to be displayed in YUI step description
 * @returns step details
 */
export function getYUIDetails(appRootPath: string): { name: string; description: string }[] {
    return [
        {
            name: 'Deployment Configuration',
            description: `Configure Deployment settings - ${basename(appRootPath)}`
        }
    ];
}

