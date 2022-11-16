import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import type { Manifest, Package } from '@sap-ux/project-access';
import type { PackageJsonMockConfig } from '../types';

/**
 * Enhance the package.json with dependency for mockserver.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param basePath - path to application root, where package.json is
 * @param webappPath - path to webapp folder, where manifest is
 * @param config - optional config for mockserver
 */
export function enhancePackageJson(
    fs: Editor,
    basePath: string,
    webappPath: string,
    config?: PackageJsonMockConfig
): void {
    const packageJsonPath = join(basePath, 'package.json');
    const packageJson = fs.readJSON(packageJsonPath) as Package;
    enhanceDependencies(packageJson, config?.mockserverModule, config?.mockserverVersion);
    enhanceScripts(fs, packageJson, webappPath);
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
    packageJson.ui5 = packageJson.ui5 || {};
    packageJson.ui5.dependencies = packageJson.ui5.dependencies || [];
    const ui5Dependencies = packageJson.ui5.dependencies.filter(
        (dep) => dep !== '@sap/ux-ui5-fe-mockserver-middleware'
    );
    if (!ui5Dependencies.includes(mockserverModule)) {
        ui5Dependencies.push(mockserverModule);
    }
    packageJson.ui5.dependencies = ui5Dependencies;
}

/**
 * Get the tile name of the app from app id in manifest.json and flpSandbox.hml.
 *
 * @param appId - id of app from manifest.json
 * @param flpSandboxContent - content of file flpSandbox.html as string
 * @returns - name of the tile for the app, might be empty string if not found
 */
function getFlpSandboxTileName(appId: string, flpSandboxContent: string): string {
    let flpSandboxTileName = '';
    // Search for most recent tile name
    const nameWithNs = `${appId.replace(/\./g, '')}-tile`;
    if (flpSandboxContent.includes(nameWithNs)) {
        flpSandboxTileName = nameWithNs;
    } else {
        // Search for older definitions of tile name
        const nameNoNs = `${appId.split('.').pop()}-tile`;
        if (flpSandboxContent) {
            flpSandboxTileName = nameNoNs;
        }
    }
    return flpSandboxTileName;
}

/**
 * Returns whether the start-mock script in package.json is legacy.
 *
 * @param startMockScript - string of the start-mock script in package.json
 * @returns - true: is a legacy script; false: not a legacy script, perhaps custom script
 */
function isLegacyStartMockScript(startMockScript: string): boolean {
    return (
        startMockScript.startsWith(`fiori run --config ./ui5-mock.yaml --open`) &&
        startMockScript.includes('test/flpSandbox.html')
    );
}
/**
 * Add basic start script for mock server to package.json which does not open a specific file or tile.
 * If there is an existing start-mock script, copy it to start-mock_.
 *
 * @param packageJson - content of package.json
 */
function enhanceBasicStartMockserverScript(packageJson: Package): void {
    packageJson.scripts = packageJson.scripts || {};
    if (
        packageJson.scripts['start-mock'] &&
        !packageJson.scripts['start-mock'].startsWith('fiori run --config ./ui5-mock.yaml')
    ) {
        packageJson.scripts['start-mock_'] = packageJson.scripts['start-mock'];
    }
    packageJson.scripts['start-mock'] = `fiori run --config ./ui5-mock.yaml --open \"/\"`;
}

/**
 * Adds start-mock script to package.json, do nothing if script is up to date. If there is a
 * custom start-mock script, copy it to start-mock_.
 *
 * @param fs - mem-fs reference to be used for file access
 * @param packageJson - path to package.json
 * @param webappPath - path to webapp folder
 */
function enhanceScripts(fs: Editor, packageJson: Package, webappPath: string): void {
    const flpSandboxPath = join(webappPath, 'test', 'flpSandbox.html');
    if (!fs.exists(flpSandboxPath)) {
        // If the file 'flpSandbox.html' does not exist add a basic script
        // to start with mockserver but don't open any specific page
        enhanceBasicStartMockserverScript(packageJson);
        return;
    }
    const flpSandboxContent = fs.read(flpSandboxPath);
    const manifest = fs.readJSON(join(webappPath, 'manifest.json')) as unknown as Manifest;
    const appId = manifest?.['sap.app']?.id;
    let flpSandboxTileName = '';
    if (appId) {
        flpSandboxTileName = getFlpSandboxTileName(appId, flpSandboxContent);
    }
    const startMockScript = `fiori run --config ./ui5-mock.yaml --open \"test/flpSandbox.html?sap-ui-xx-viewCache=false#${flpSandboxTileName}\"`;
    packageJson.scripts = packageJson.scripts || {};
    if (packageJson.scripts['start-mock'] && !isLegacyStartMockScript(packageJson.scripts['start-mock'])) {
        packageJson.scripts['start-mock_'] = packageJson.scripts['start-mock'];
    }
    packageJson.scripts['start-mock'] = startMockScript;
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
    if (packageJson) {
        delete packageJson?.scripts?.['start-mock'];
        delete packageJson?.devDependencies?.['@sap/ux-ui5-fe-mockserver-middleware'];
        delete packageJson?.devDependencies?.['@sap-ux/ui5-middleware-fe-mockserver'];
        if (packageJson?.ui5?.dependencies && Array.isArray(packageJson?.ui5?.dependencies)) {
            packageJson.ui5.dependencies = packageJson.ui5.dependencies.filter(
                (d) => d !== '@sap/ux-ui5-fe-mockserver-middleware' && d !== '@sap-ux/ui5-middleware-fe-mockserver'
            );
        }
    }
    fs.writeJSON(packageJsonPath, packageJson);
}
