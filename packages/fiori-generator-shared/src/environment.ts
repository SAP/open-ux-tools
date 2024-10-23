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
 * @returns the platform name and technical name
 */
export function getHostEnvironment(): { name: string; technical: string } {
    if (isCli()) {
        return hostEnvironment.cli;
    } else {
        return isAppStudio() ? hostEnvironment.bas : hostEnvironment.vscode;
    }
}
