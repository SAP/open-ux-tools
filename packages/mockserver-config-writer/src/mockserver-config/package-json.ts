import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import type { PackageJsonMockConfig } from '../types';

/**
 * Enhance the package.json with dependency for mockserver.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to application root, where package.json is
 * @param config - optional config for mockserver
 */
export function enhancePackageJson(fs: Editor, basePath: string, config?: PackageJsonMockConfig): void {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    enhanceDependencies(packageJson, config?.mockserverModule, config?.mockserverVersion);
    enhanceScripts(fs, packageJson);
    fs.writeJSON(packageJsonPath, packageJson);
}

/**
 * Add mockserver dependencies to package.json content.
 * Takes also care of removing deprecated old module.
 *
 * @param packageJson - parsed package.json content
 * @param mockserverModule - npm name of the mockserver module
 * @param version - npm version string
 */
function enhanceDependencies(
    packageJson: Package,
    mockserverModule = '@sap-ux/ui5-middleware-fe-mockserver',
    version = '2'
) {
    packageJson.devDependencies = packageJson.devDependencies || {};
    delete packageJson.devDependencies['@sap/ux-ui5-fe-mockserver-middleware'];
    packageJson.devDependencies[mockserverModule] = version;
    packageJson.ui5 ||= {};
    packageJson.ui5.dependencies ||= [];
    const ui5Dependencies = packageJson.ui5.dependencies.filter(
        (dep) => dep !== '@sap/ux-ui5-fe-mockserver-middleware'
    );
    if (!ui5Dependencies.includes(mockserverModule)) {
        ui5Dependencies.push(mockserverModule);
    }
    packageJson.ui5.dependencies = ui5Dependencies;
}

/**
 * Add or update start-mock script to package.json.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param packageJson - path to package.json
 */
function enhanceScripts(fs: Editor, packageJson: Package): void {
    packageJson.scripts ||= {};
    packageJson.scripts['start-mock'] =
        copyStartScript(packageJson.scripts.start) || `fiori run --config ./ui5-mock.yaml --open \"/\"`;
}

/**
 * Return a copy of package.json's 'start' script with added or replaced config pointing to ui5-mock.yaml.
 * In case start script can't be copied or is undefined, return undefined.
 *
 * @param startScript - start script from package.json
 * @returns - copy of start script with config to ui5.yaml, undefined if start script can't be copied
 */
function copyStartScript(startScript: string | undefined): string | undefined {
    if (typeof startScript !== 'string') {
        return undefined;
    }
    const fioriRun = 'fiori run';
    const fioriRunIndex = startScript.indexOf(fioriRun);
    if (fioriRunIndex < 0) {
        return undefined;
    }
    const configStartIndex = startScript.indexOf('--config', fioriRunIndex);
    const startMockScript =
        configStartIndex < 0
            ? startScript.replace(fioriRun, `${fioriRun} --config ./ui5-mock.yaml`)
            : replaceConfig(startScript, configStartIndex);
    return startMockScript;
}

/**
 * Replace the --config <any/path> in script with --config ./ui5-mock.yaml and return as new string.
 *
 * @param startScript - script that contains --config path/to/any.yaml
 * @param configStartIndex - index in string where --config starts (first after fiori run)
 * @returns - new script string with replaced --config
 */
function replaceConfig(startScript: string, configStartIndex: number): string {
    const argStart = configStartIndex + '--config'.length + 1;
    const yamlStart = startScript.slice(argStart).search(/[^\s]/) + argStart;
    let separator = ' ';
    let quotischSepOffset = 0;
    if (startScript[yamlStart] === '"' || startScript[yamlStart] === "'") {
        separator = startScript[yamlStart];
        quotischSepOffset = 1;
    }
    let yamlEnd = startScript.indexOf(separator, yamlStart + quotischSepOffset);
    yamlEnd = yamlEnd === -1 ? startScript.length : yamlEnd + quotischSepOffset;
    const startMockScript = `${startScript.substring(0, argStart)}./ui5-mock.yaml${startScript.substring(yamlEnd)}`;
    return startMockScript;
}

/**
 * Remove mockserver script and dependencies from package.json.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to application root, where package.json is
 */
export function removeFromPackageJson(fs: Editor, basePath: string): void {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    delete packageJson.scripts?.['start-mock'];
    if (packageJson.scripts && Object.keys(packageJson.scripts).length === 0) {
        delete packageJson.scripts;
    }
    delete packageJson.devDependencies?.['@sap/ux-ui5-fe-mockserver-middleware'];
    delete packageJson.devDependencies?.['@sap-ux/ui5-middleware-fe-mockserver'];
    if (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length === 0) {
        delete packageJson.devDependencies;
    }
    if (packageJson.ui5?.dependencies && Array.isArray(packageJson.ui5.dependencies)) {
        packageJson.ui5.dependencies = packageJson.ui5.dependencies.filter(
            (d) => d !== '@sap/ux-ui5-fe-mockserver-middleware' && d !== '@sap-ux/ui5-middleware-fe-mockserver'
        );
        if (packageJson.ui5.dependencies.length === 0) {
            delete packageJson.ui5.dependencies;
        }
    }
    if (packageJson.ui5 && Object.keys(packageJson.ui5).length === 0) {
        delete packageJson.ui5;
    }
    fs.writeJSON(packageJsonPath, packageJson);
}
