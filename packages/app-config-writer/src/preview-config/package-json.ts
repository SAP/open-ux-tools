import { basename, join } from 'path';
import { isTestPath } from './ui5-yaml';
import { extractYamlConfigFileName } from '../common/ui5-yaml';
import { generateVariantsConfig } from '../variants-config';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { type Package, hasDependency } from '@sap-ux/project-access';
import type { FlpConfig } from '@sap-ux/preview-middleware';
import type { Script } from './ui5-yaml';

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
 * Extracts the URL details from a given script.
 *
 * It extracts the used mount point for the preview and the used intent.
 *
 * @param script - the content of the script
 * @returns the URL details
 */
export function extractUrlDetails(script: string): {
    path: string | undefined;
    intent: FlpConfig['intent'] | undefined;
} {
    //extract the URL from the 'open' command of the script
    let url = / (?:--open|-o|--o) (\S*)/.exec(script)?.[1] ?? undefined;
    //delete double or single quotes from the URL
    url = url?.replace(/['"]/g, '');

    //extract the path from the URL
    const path = /^[^?#]+\.html/.exec(url ?? '')?.[0] ?? undefined;

    //extract the intent from the URL
    const intent = /(?<=#)\w+-\w+/.exec(url ?? '')?.[0] ?? undefined;

    return {
        path,
        intent: intent
            ? {
                  object: intent?.split('-')[0],
                  action: intent?.split('-')[1]
              }
            : undefined
    };
}

/**
 * Check if the script/-name is valid for the conversion.
 *
 * The script:
 * - must contain 'ui5 serve' or 'fiori run' command
 * - must not be a test script
 * - must not relate to 'webapp/index.html'.
 *
 * The script name:
 * - must not be 'start-variants-management'
 * - must not be 'start-control-property-editor'.
 *
 * @param script - the script from the package.json file
 * @param convertTests - indicator if test suite and test runner should be included in the conversion (default: false)
 * @returns indicator if the script is valid
 */
export function isValidPreviewScript(script: Script, convertTests: boolean = false): boolean {
    const isValidScriptName =
        script.name != 'start-variants-management' && script.name != 'start-control-property-editor';

    //eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const startsWebServer = !!(script.value.includes('ui5 serve') || script.value.includes('fiori run'));
    const { path } = extractUrlDetails(script.value);
    const opensTest = isTestPath(script ?? '');
    const opensIndexHtml = path === 'index.html';

    //tests are only relevant if the conversion of test runners is excluded
    return isValidScriptName && startsWebServer && !opensIndexHtml && (convertTests ? true : !opensTest);
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
