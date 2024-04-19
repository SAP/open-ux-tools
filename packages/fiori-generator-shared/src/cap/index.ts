import { readFileSync } from 'fs';
import { join } from 'path';
import type { CapCustomPaths } from '@sap-ux/project-access';

/**
 * Lightweight synchronous function to get the CAP project custom paths.
 * A more robust async alternative is `getCapCustomPaths` in `@sap-ux/project-access`.
 *
 * @param capProjectPath - path to project root
 * @returns cap custom paths
 */
export function getCapFolderPathsSync(capProjectPath: string): CapCustomPaths {
    const capPaths: CapCustomPaths = {
        app: 'app/',
        db: 'db/',
        srv: 'srv/'
    };

    const cdsrcPath = join(capProjectPath, '.cdsrc.json');
    const packageJsonPath = join(capProjectPath, 'package.json');
    const configFiles = [cdsrcPath, packageJsonPath];

    for (const configFile of configFiles) {
        try {
            const config = JSON.parse(readFileSync(configFile).toString());

            for (const folder of Object.keys(capPaths)) {
                let customPath;

                if (config?.folders?.[folder]) {
                    customPath = config.folders[folder];
                } else if (config?.cds?.folders?.[folder]) {
                    customPath = config.cds.folders[folder];
                }
                if (customPath) {
                    capPaths[folder as keyof CapCustomPaths] = customPath;
                }
            }
        } catch {
            // Ignore errors as may have no custom paths or invalid configs
        }
    }

    return capPaths;
}
