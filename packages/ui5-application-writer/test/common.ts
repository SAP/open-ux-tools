import { join } from 'path';
import type { Editor } from 'mem-fs-editor';

export const updatePackageJSONDependencyToUseLocalPath = async (rootPath: string, fs: Editor): Promise<void> => {
    const packagePath = join(rootPath, 'package.json');
    const packageJson = fs.readJSON(packagePath) as any;
    if (packageJson?.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']) {
        packageJson.devDependencies['@sap-ux/eslint-plugin-fiori-tools'] = '../../../../eslint-plugin-fiori-tools/';
    }
    fs.writeJSON(packagePath, packageJson);
};
