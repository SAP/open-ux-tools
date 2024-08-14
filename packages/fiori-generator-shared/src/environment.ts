import { isAppStudio } from '@sap-ux/btp-utils';

export const hostEnvironment = {
    vscode: {
        name: 'Visual Studio Code',
        technical: 'VSCode'
    },
    bas: {
        name: 'SAP Business Application Studio',
        technical: 'SBAS'
    },
    cli: {
        name: 'CLI',
        technical: 'CLI'
    }
};

/**
 * Determine if the current prompting environment is cli or a hosted extension (app studio or vscode).
 *
 * @returns the platform name and technical name
 */
export function getHostEnvironment(): { name: string; technical: string } {
    if (process.argv[1]?.includes('yo') || process.stdin.isTTY) {
        return hostEnvironment.cli;
    } else {
        return isAppStudio() ? hostEnvironment.bas : hostEnvironment.vscode;
    }
}