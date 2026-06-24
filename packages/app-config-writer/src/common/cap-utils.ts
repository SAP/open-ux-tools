import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { FileName, type Package } from '@sap-ux/project-access';

/**
 * Writes a `cds watch` script to the CAP root `package.json`.
 *
 * @param capRoot - path to the CAP project root
 * @param scriptKey - key of the script to write (e.g. 'start-cards-generator-my_app')
 * @param openPath - the path to open, relative to the CDS server root (e.g. 'ns.myapp/test/...')
 * @param fs - mem-fs-editor instance
 * @param logger - optional logger
 */
export function writeCdsWatchScript(
    capRoot: string,
    scriptKey: string,
    openPath: string,
    fs: Editor,
    logger?: { debug: (msg: string) => void }
): void {
    const packageJsonPath = join(capRoot, 'package.json');
    if (!fs.exists(packageJsonPath)) {
        throw new Error(`package.json not found at CAP root: ${capRoot}`);
    }

    const packageJson = (fs.readJSON(packageJsonPath) ?? {}) as Package;
    packageJson.scripts ??= {};
    packageJson.scripts[scriptKey] = `cds watch --open "${openPath}"`;

    fs.writeJSON(packageJsonPath, packageJson);
    logger?.debug(`Script '${scriptKey}' written to CAP root package.json.`);
}
