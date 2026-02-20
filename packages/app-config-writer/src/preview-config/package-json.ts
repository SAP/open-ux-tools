import { basename, join } from 'node:path';
import { extractYamlConfigFileName } from '../common/package-json';
import { generateVariantsConfig } from '../variants-config';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { type Package, hasDependency } from '@sap-ux/project-access';

/**
 * Ensures that the @sap/ux-ui5-tooling or @sap-ux/preview-middleware dependency exists in the package.json.
 *
 * If none dependency is given, the @sap-ux/preview-middleware will be added as a devDependency.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 */
export function ensurePreviewMiddlewareDependency(fs: Editor, basePath: string): void {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    if (!packageJson) {
        return;
    }

    const dependencies = ['@sap-ux/preview-middleware', '@sap/ux-ui5-tooling'];
    if (dependencies.some((dependency) => hasDependency(packageJson, dependency))) {
        return;
    }

    packageJson.devDependencies = { ...packageJson.devDependencies, '@sap-ux/preview-middleware': 'latest' };
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Updates the variants creation script in package.json if needed.
 *
 * If an update is needed, the used intent of the script will be adjusted based on the used UI5 yaml configuration.
 *
 * @param fs - file system reference
 * @param basePath - base path to be used for the conversion
 * @param logger logger to report info to the user
 */
export async function updateVariantsCreationScript(fs: Editor, basePath: string, logger?: ToolsLogger): Promise<void> {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package | undefined;
    if (packageJson?.scripts?.['start-variants-management']) {
        const ui5Yaml = basename(extractYamlConfigFileName(packageJson?.scripts?.['start-variants-management']));
        const yamlPath = join(basePath, ui5Yaml);
        await generateVariantsConfig(basePath, yamlPath, logger, fs);
    }
}
