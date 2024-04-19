import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CapCustomPaths } from '@sap-ux/project-access';

/**
 * Lightweight synchronous function to get the CAP project custom paths.
 * A more robust async alternative is `getCapCustomPaths` in `@sap-ux/project-access`.
 *
 * @param capProjectPath - path to project root
 * @returns cap custom paths
 */
export function getCapFolderPaths(capProjectPath: string): CapCustomPaths {
    const capPaths: CapCustomPaths = {
        app: 'app/',
        db: 'db/',
        srv: 'srv/'
    };

    const cdsrcPath = join(`${capProjectPath}/.cdsrc.json`);
    const packageJsonPath = join(`${capProjectPath}/package.json`);

    try {
        for (const folder of Object.keys(capPaths)) {
            if (!existsSync(join(`${capProjectPath}/${folder}`))) {
                const cdsrcCustomPath = getCdsrcCustomPaths(cdsrcPath, folder);
                if (cdsrcCustomPath) {
                    capPaths[folder as keyof CapCustomPaths] = cdsrcCustomPath;
                } else {
                    const packageCustomPath = getPackageCustomPaths(packageJsonPath, folder);
                    if (packageCustomPath) {
                        capPaths[folder as keyof CapCustomPaths] = packageCustomPath;
                    }
                }
            }
        }
    } catch {
        // Ignore errors as may have no custom paths or invalid configs
    }

    return capPaths;
}

/**
 * Inspects the .cdsrc.json file for custom paths and returns the custom path for the given folder if found.
 *
 * @param cdsrcPath - path to .cdsrc.json
 * @param folder - folder to get the custom path for
 * @returns - custom path
 */
function getCdsrcCustomPaths(cdsrcPath: string, folder: string): string | undefined {
    let customPath;
    if (existsSync(cdsrcPath)) {
        const config = JSON.parse(readFileSync(cdsrcPath).toString());
        if (config?.folders[folder]) {
            customPath = config.folders[folder];
        }
    }
    return customPath;
}

/**
 * Inspects the package.json file for custom paths and returns the custom path for the given folder if found.
 *
 * @param packageJsonPath - path to package.json
 * @param folder - folder to get the custom path for
 * @returns - custom path
 */
function getPackageCustomPaths(packageJsonPath: string, folder: string): string | undefined {
    let customPath;
    if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath).toString());
        if (packageJson?.cds?.folders[folder]) {
            customPath = packageJson.cds.folders[folder];
        }
    }
    return customPath;
}
