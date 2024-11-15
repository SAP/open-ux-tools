import { isAppStudio } from '@sap-ux/btp-utils';

export const PLATFORMS = {
    VSCODE: {
        name: 'Visual Studio Code',
        technical: 'VSCode'
    },
    SBAS: {
        name: 'SAP Business Application Studio',
        technical: 'SBAS'
    },
    CLI: {
        name: 'CLI',
        technical: 'CLI'
    }
};

/**
 * Determine if the current environment is cli or YUI (app studio or vscode)
 */
export function getPlatform(): { name: string; technical: string } {
    if ((process.mainModule && process.mainModule.filename.includes('yo')) || process.stdin.isTTY) {
        return PLATFORMS.CLI;
    } else {
        return isAppStudio() ? PLATFORMS.SBAS : PLATFORMS.VSCODE;
    }
}
