import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import type { Editor } from 'mem-fs-editor';

const require = createRequire(import.meta.url);

export const updatePackageJSONDependencyToUseLocalPath = async (rootPath: string, fs: Editor): Promise<void> => {
    const packagePath = join(rootPath, 'package.json');
    const packageJson = fs.readJSON(packagePath) as any;
    if (packageJson?.devDependencies?.['@sap-ux/eslint-plugin-fiori-tools']) {
        packageJson.devDependencies['@sap-ux/eslint-plugin-fiori-tools'] = dirname(
            require.resolve('@sap-ux/eslint-plugin-fiori-tools/package.json')
        );
    }
    fs.writeJSON(packagePath, packageJson);
};
