import { FileName } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';

/**
 * Updates the tsconfig.json file to correct the type roots when node_modules
 * are not found in the same directory as the application.
 *
 * @param {Editor} fs The file system editor.
 * @param {string} appRoot The root directory of the application.
 */
export function updateTsConfigCap(fs: Editor, appRoot: string): void {
    const tsConfigPath = join(appRoot, FileName.Tsconfig);
    if (fs.exists(tsConfigPath)) {
        const tsConfig: any = fs.readJSON(tsConfigPath);
        if (tsConfig['compilerOptions']['typeRoots']) {
            const typeRoots = tsConfig['compilerOptions']['typeRoots'];
            const updatedTypeRoots = typeRoots.map((entry: string) => {
                return entry.replace(/\.\//g, '../../');
            });

            // Update the tsconfig.json file
            fs.extendJSON(tsConfigPath, {
                compilerOptions: {
                    typeRoots: [...typeRoots, ...updatedTypeRoots]
                }
            });
        }
    }
}
