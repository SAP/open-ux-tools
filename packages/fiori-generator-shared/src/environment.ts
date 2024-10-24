import { isAppStudio } from '@sap-ux/btp-utils';
import { hostEnvironment } from './types';

/**
 * Determine if the current prompting environment is cli .
 *
 * @returns true if it is a cli environment, false otherwise
 */
export function isCli(): boolean {
    if (process.argv[1]?.includes('yo') || process.stdin.isTTY) {
        return true;
    } else {
        return false;
    }
}

/**
 * Determine if the current prompting environment is cli or a hosted extension (app studio or vscode).
 *
 * @param isYUI - optional property to indicate if the environment is a hosted extension
 * @returns the platform name and technical name
 */
export function getHostEnvironment(isYUI?: boolean): { name: string; technical: string } {
    if (isYUI === false || (isYUI === undefined && isCli())) {
        return hostEnvironment.cli;
    }
    return isAppStudio() ? hostEnvironment.bas : hostEnvironment.vscode;
}
