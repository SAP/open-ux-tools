import { Minimatch } from 'minimatch';
import coreGitignore from '../../templates/core/gitignore.ejs';
import corePackageJson from '../../templates/core/package.json.ejs';
import coreUi5LocalYaml from '../../templates/core/ui5-local.yaml.ejs';
import coreUi5Yaml from '../../templates/core/ui5.yaml.ejs';
import coreWebappComponent from '../../templates/core/webapp/Component.js.ejs';
import coreWebappIndex from '../../templates/core/webapp/index.html.ejs';
import coreWebappManifest from '../../templates/core/webapp/manifest.json.ejs';
import coreWebappI18nProperties from '../../templates/core/webapp/i18n/i18n.properties.ejs';

import optionalCodeAssistEslintRc from '../../templates/optional/codeAssist/.eslintrc.ejs';
import optionalCodeAssistPackageJson from '../../templates/optional/codeAssist/package.json.ejs';
import optionalCodeAssistTsconfig from '../../templates/optional/codeAssist/tsconfig.json.ejs';

import optionalEslintEslintRc from '../../templates/optional/eslint/.eslintrc.ejs';
import optionalEslintPackageJson from '../../templates/optional/eslint/package.json.ejs';

import loadReuseLibs1120WebappTest from '../../templates/optional/loadReuseLibs/1.120.0/webapp/test/locate-reuse-libs.js.ejs';
import loadReuseLibs171WebappTest from '../../templates/optional/loadReuseLibs/1.71.0/webapp/test/locate-reuse-libs.js.ejs';

import optionalNpmPackageConsumptionPackageJson from '../../templates/optional/npmPackageConsumption/package.json.ejs';
import optionalSapuxPackageJson from '../../templates/optional/sapux/package.json.ejs';

import optionalTypescriptWebappComponent from '../../templates/optional/typescript/webapp/Component.ts.ejs';
import optionalTypescriptEslintRc from '../../templates/optional/typescript/.eslintrc.ejs';
import optionalTypescriptPackageJson from '../../templates/optional/typescript/package.json.ejs';
import optionalTypescriptTsconfig from '../../templates/optional/typescript/tsconfig.json.ejs';

const templates = {
    'core/.gitignore': coreGitignore,
    'core/package.json': corePackageJson,
    'core/ui5-local.yaml': coreUi5LocalYaml,
    'core/ui5.yaml': coreUi5Yaml,
    'core/webapp/Component.js': coreWebappComponent,
    'core/webapp/index.html': coreWebappIndex,
    'core/webapp/manifest.json': coreWebappManifest,
    'core/webapp/i18n/i18n.properties': coreWebappI18nProperties,
    'optional/codeAssist/.eslintrc': optionalCodeAssistEslintRc,
    'optional/codeAssist/package.json': optionalCodeAssistPackageJson,
    'optional/codeAssist/tsconfig.json': optionalCodeAssistTsconfig,
    'optional/eslint/.eslintrc': optionalEslintEslintRc,
    'optional/eslint/package.json': optionalEslintPackageJson,
    'optional/npmPackageConsumption/package.json': optionalNpmPackageConsumptionPackageJson,
    'optional/loadReuseLibs/1.120.0/webapp/test/locate-reuse-libs.js': loadReuseLibs1120WebappTest,
    'optional/loadReuseLibs/1.71.0/webapp/test/locate-reuse-libs.js': loadReuseLibs171WebappTest,
    'optional/sapux/package.json': optionalSapuxPackageJson,
    'optional/typescript/webapp/Component.ts': optionalTypescriptWebappComponent,
    'optional/typescript/.eslintrc': optionalTypescriptEslintRc,
    'optional/typescript/package.json': optionalTypescriptPackageJson,
    'optional/typescript/tsconfig.json': optionalTypescriptTsconfig
};

/**
 * Recursively retrieves all files and their content from the templates JSON object.
 *
 * @param {string} basePath - The base path in the templates object to start from (e.g., 'core' or 'optional/eslint').
 * @param {Function} [processDestinationPath] - Optional callback to process destination paths.
 * @param {string[]} [ignore] - Optional array of glob file paths to ignore.
 * @returns {Map<string, string>} - A map where keys are file paths and values are their content.
 */
export function getFilesFromTemplates(
    basePath: string,
    processDestinationPath?: (path: string) => string,
    ignore?: string[]
): Map<string, string> {
    const result = new Map<string, string>();

    for (const [key, value] of Object.entries(templates)) {
        if (key.startsWith(basePath)) {
            if (ignore?.some((pattern) => new Minimatch(pattern).match(key))) {
                continue;
            }
            let destinationPath = key;
            // Remove the basePath from the destination path
            destinationPath = destinationPath.replace(`${basePath}/`, '');
            if (processDestinationPath) {
                destinationPath = processDestinationPath(destinationPath);
            }
            result.set(destinationPath, value);
        }
    }

    return result;
}
