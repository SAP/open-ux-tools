import { isAppStudio } from '@sap-ux/btp-utils';

interface Platform {
    name: string;
    technical: string;
}

export const PLATFORMS: { [key: string]: Platform } = {
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
 * Determines the platform where the application is running.
 *
 * @returns {Platform} An object containing the platform's name and technical identifier.
 */
export function getPlatform(): Platform {
    if (process.mainModule?.filename.includes('yo') || process.stdin.isTTY) {
        return PLATFORMS.CLI;
    } else {
        return isAppStudio() ? PLATFORMS.SBAS : PLATFORMS.VSCODE;
    }
}
