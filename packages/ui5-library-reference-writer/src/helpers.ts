import type { Editor } from 'mem-fs-editor';
import type { ReuseLibConfig } from './types';
import { UI5Config, type ServeStaticPath } from '@sap-ux/ui5-config';
import { getWebappPath, type Manifest } from '@sap-ux/project-access';
import { join, relative } from 'path';
import { yamlFiles, ManifestReuseType } from './constants';
import { YamlDocument } from '@sap-ux/yaml';
import type { Logger } from '@sap-ux/logger';

/**
 * Updates manifest with references for the chosen reuse libs.
 *
 * @param projectPath fiori project path
 * @param reuseLibs reuse libraries for referencing
 * @param fs mem-fs editor instance
 */
export async function updateManifest(projectPath: string, reuseLibs: ReuseLibConfig[], fs: Editor) {
    const webapp = await getWebappPath(projectPath);
    const manifestPath = join(webapp, 'manifest.json');
    const manifest = fs.readJSON(manifestPath) as any as Manifest;

    reuseLibs.forEach((lib) => {
        const reuseType = lib.type === 'library' ? ManifestReuseType.Library : ManifestReuseType.Component;
        if (manifest['sap.ui5']?.dependencies && !manifest['sap.ui5']?.dependencies?.[reuseType]) {
            manifest['sap.ui5'].dependencies[reuseType] = {};
        }
        Object.assign(manifest['sap.ui5']?.dependencies?.[reuseType] ?? {}, {
            [lib.name]: { lazy: false }
        });
    });

    fs.writeJSON(manifestPath, manifest);
}

/**
 * Updates the ui5.yaml file for Node.js-based CAP projects with NPM workspaces enabled.
 *
 * @param {Editor} fs The file system editor instance.
 * @param {string} yamlPath The path to the ui5.yaml file.
 * @param {Logger} [logger] The logger instance for logging errors.
 * @returns {void}
 */
export async function removeFioriToolsProxyAndAppReload(fs: Editor, yamlPath: string, logger?: Logger): Promise<void> {
    try {
        const yamlDocument = fs.read(yamlPath).toString();
        const parsedYamlDocuments = await YamlDocument.newInstance(yamlDocument);
        const doc = parsedYamlDocuments['documents'][0];
        const server: any = doc.get('server');
        // remove fiori tools proxy
        server.customMiddleware = server.customMiddleware.filter(
            (middleware: any) => middleware.name !== 'fiori-tools-proxy'
        );
        // remove config from appreload
        const previewIdx = server.customMiddleware.findIndex(
            (middleware: any) => middleware.name === 'fiori-tools-appreload'
        );
        delete server.customMiddleware[previewIdx]['configuration'];
        doc.set('server', server);
        fs.write(yamlPath, JSON.stringify(doc));
    } catch (error) {
        logger?.error(error);
    }
}

/**
 * Updates the application YAML file by adding static resource locations if not already present.
 *
 * @param {Editor} fs The file system editor instance.
 * @param {string} applicationYamlPath The path to the application YAML file.
 * @param {string} capCustomPathsApp The custom paths for CAP application.
 * @param {Logger} [logger] The logger instance for logging errors.
 * @returns {void}
 */
export async function updateStaticLocationsInApplicationYaml(
    fs: Editor,
    applicationYamlPath: string,
    capCustomPathsApp: string,
    logger?: Logger
): Promise<void> {
    try {
        const applicationYamlDocuments = fs.read(applicationYamlPath).toString();
        const parsedApplicationYamlDocuments: any = await YamlDocument.newInstance(applicationYamlDocuments);
        if (
            parsedApplicationYamlDocuments.length === 1 &&
            parsedApplicationYamlDocuments[0].spring['web.resources.static-locations'] === undefined
        ) {
            const applicationYamlFirstDocument = parsedApplicationYamlDocuments[0];
            applicationYamlFirstDocument.spring['web.resources.static-locations'] = `file:./${capCustomPathsApp}`;
            fs.write(applicationYamlPath, JSON.stringify(applicationYamlFirstDocument));
        }
    } catch (error) {
        logger?.error(error);
    }
}

/**
 * Updates yaml files with references for the chosen reuse libs.
 *
 * @param projectPath fiori project path
 * @param reuseLibs reuse libraries for referencing
 * @param fs mem-fs editor instance
 */
export function updateYaml(projectPath: string, reuseLibs: ReuseLibConfig[], fs: Editor) {
    yamlFiles.forEach(async (yaml) => {
        const yamlPath = join(projectPath, yaml);
        if (fs.exists(yamlPath)) {
            const ui5Config = await UI5Config.newInstance(fs.read(yamlPath));
            const serveStaticPaths: ServeStaticPath[] = getServeStaticPaths(reuseLibs, projectPath);
            ui5Config.addServeStaticConfig(serveStaticPaths);

            fs.write(yamlPath, ui5Config.toString());
        }
    });
}

/**
 * Returns the serve static paths for the reuse libraries.
 *
 * @param reuseLibs reuse libraries for referencing
 * @param projectPath fiori project path
 * @returns serve static paths
 */
function getServeStaticPaths(reuseLibs: ReuseLibConfig[], projectPath: string): ServeStaticPath[] {
    let serveStaticPaths: ServeStaticPath[] = [];

    reuseLibs.forEach((lib) => {
        const reuseLibRefs: ServeStaticPath[] = [
            {
                path: `/resources/${lib.name.replace(/\./g, '/')}`,
                src: relative(projectPath, lib.path),
                fallthrough: false
            }
        ];

        if (lib.uri) {
            reuseLibRefs.push({
                path: `${lib.uri.replace(/\/bsp\//g, '/ui5_ui5/')}`,
                src: relative(projectPath, lib.path),
                fallthrough: false
            });
        }
        serveStaticPaths = [...serveStaticPaths, ...reuseLibRefs];
    });

    return serveStaticPaths;
}
