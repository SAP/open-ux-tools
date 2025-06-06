import { isAppStudio } from '@sap-ux/btp-utils';
import { hostEnvironment, type HostEnvironmentId } from './types';

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
export function getHostEnvironment(): { name: string; technical: HostEnvironmentId } {
    if (isCli()) {
        return hostEnvironment.cli;
    }
    return isAppStudio() ? hostEnvironment.bas : hostEnvironment.vscode;
}
