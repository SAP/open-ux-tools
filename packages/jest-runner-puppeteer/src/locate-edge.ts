import fs from 'fs';
import { join } from 'path';
import which from 'which';

/**
 * Searches for the Edge browser executable on a Linux system.
 *
 * @param binaryNames the name(s) of the Edge browser binary
 * @returns the path to the Edge browser executable, or null if not found
 * @throws if Edge browser is not found, provides a list of searched executables
 */
function getEdgeLinux(binaryNames: Array<string> | string): string | null {
    if (process.platform !== 'linux') {
        return null;
    }

    if (!Array.isArray(binaryNames)) {
        binaryNames = [binaryNames];
    }

    const paths = [];

    for (const name of binaryNames) {
        try {
            return which.sync(name);
        } catch (e) {
            // This means path doesn't exist
            paths.push(name);
        }
    }

    throw new Error(
        `Edge browser not found. Please recheck your installation. Here are list of executable we tried to search: ${paths.join()}`
    );
}

/**
 * Searches for the Edge browser executable on a Windows system.
 *
 * @param edgeDirName the directory name of the Edge browser
 * @returns the path to the Edge browser executable, or null if not found
 * @throws if Edge browser is not found
 */
function getEdgeExe(edgeDirName: 'Edge' | 'Edge Dev' | 'Edge Beta' | 'Edge SxS'): string | null {
    if (process.platform !== 'win32') {
        return null;
    }

    const paths = [];
    const suffix = `\\Microsoft\\${edgeDirName}\\Application\\msedge.exe`;
    const prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(
        (v) => !!v
    );

    for (const prefix of prefixes) {
        const edgePath = join(prefix, suffix);
        paths.push(edgePath);

        if (fs.existsSync(edgePath)) {
            return edgePath;
        }
    }

    throw new Error('Edge browser not found. Please recheck your installation.');
}

/**
 * Searches for the Edge browser executable on a macOS system.
 *
 * @param defaultPath the default path to the Edge browser executable.
 * @returns the path to the Edge browser executable, or null if not found
 * @throws if Edge browser is not found
 */
function getEdgeDarwin(defaultPath: string): string | null {
    if (process.platform !== 'darwin') {
        return null;
    }

    if (fs.existsSync(defaultPath)) {
        return defaultPath;
    }

    throw new Error(`Edge browser not found. Please recheck your installation. Path ${defaultPath}`);
}

/**
 * Retrieves the path to the Edge browser executable based on the current platform.
 *
 * @returns the path to the Edge browser executable, or null if not found
 * @throws if the current platform is not supported
 */
export function getEdgePath(): string {
    const edge = {
        linux: getEdgeLinux(['edge']),
        darwin: getEdgeDarwin('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
        win32: getEdgeExe('Edge')
    };

    if (process.platform && process.platform in edge) {
        return edge[process.platform];
    }

    throwInvalidPlatformError();
}

/**
 * Retrieves the path to the Edge Dev browser executable based on the current platform.
 *
 * @returns the path to the Edge Dev browser executable, or null if not found
 * @throws if the current platform is not supported
 */
export function getEdgeDevPath(): string {
    const edgeDev = {
        linux: getEdgeLinux('microsoft-edge-dev'),
        darwin: getEdgeDarwin('/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev'),
        win32: getEdgeExe('Edge Dev')
    };

    if (process.platform && process.platform in edgeDev) {
        return edgeDev[process.platform];
    }

    throwInvalidPlatformError();
}

/**
 * Retrieves the path to any available stable version of the Edge browser based on the current platform.
 *
 * @returns the path to the Edge browser executable.
 * @throws if no Edge browser executable is found.
 */
export function getAnyEdgeStable(): string {
    try {
        return getEdgePath();
    } catch (e) {
        console.error(e.message);
    }

    try {
        return getEdgeDevPath();
    } catch (e) {
        console.error(e.message);
    }

    throw new Error('Unable to find any path');
}

/**
 * Throws an error to indicare the platform is not supported.
 *
 * @throws error message.
 */
function throwInvalidPlatformError() {
    throw new Error('Your platform is not supported.');
}
