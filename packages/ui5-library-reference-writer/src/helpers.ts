import type { Editor } from 'mem-fs-editor';
import type { ServeStaticPath, ReuseLibConfig } from './types';
import { UI5Config, type CustomMiddleware } from '@sap-ux/ui5-config';
import { getWebappPath, type Manifest } from '@sap-ux/project-access';
import { dirname, join, relative } from 'path';
import { yamlFiles, serveStatic, fioriToolsProxy, ManifestReuseType } from './constants';

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

            const serveStaticConfig = ui5Config.findCustomMiddleware<{ paths: ServeStaticPath[] }>(serveStatic);
            const fioriToolsProxyConfig = ui5Config.findCustomMiddleware(fioriToolsProxy);
            const serveStaticPaths: ServeStaticPath[] = getServeStaticPaths(reuseLibs, projectPath);

            if (serveStaticConfig) {
                if (serveStaticConfig.afterMiddleware === 'compression' && fioriToolsProxyConfig) {
                    ui5Config.updateCustomMiddleware({
                        name: serveStatic,
                        beforeMiddleware: fioriToolsProxy,
                        configuration: {
                            paths: [...serveStaticConfig.configuration.paths, ...serveStaticPaths]
                        }
                    });
                }
            } else {
                const serveStaticConfig = getServeStaticConfig(!!fioriToolsProxyConfig, serveStaticPaths);
                ui5Config.addCustomMiddleware([serveStaticConfig]);
            }

            fs.write(yamlPath, ui5Config.toString());
        }
    });
}

/**
 * Returns the serve static configuration.
 *
 * @param hasfioriToolProxy whether fiori tools proxy is enabled
 * @param paths serve static paths
 * @returns serve static configuration
 */
function getServeStaticConfig(
    hasfioriToolProxy: boolean,
    paths: ServeStaticPath[]
): CustomMiddleware<{ paths: ServeStaticPath[] }> {
    return hasfioriToolProxy
        ? {
              name: serveStatic,
              beforeMiddleware: fioriToolsProxy,
              configuration: {
                  paths: paths
              }
          }
        : {
              name: serveStatic,
              afterMiddleware: 'compression',
              configuration: {
                  paths: paths
              }
          };
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
                src: relative(projectPath, dirname(lib.path)),
                fallthrough: false
            }
        ];

        if (lib.uri) {
            reuseLibRefs.push({
                path: `${lib.uri.replace(/\/bsp\//g, '/ui5_ui5/')}`,
                src: relative(projectPath, dirname(lib.path)),
                fallthrough: false
            });
        }
        serveStaticPaths = [...serveStaticPaths, ...reuseLibRefs];
    });

    return serveStaticPaths;
}
