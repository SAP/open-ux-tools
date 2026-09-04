import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';

/**
 * Configure an existing Fiori application through the public config-writer API.
 * This module is bundled into the portable development kit.
 *
 * @param {object} options configuration options
 * @param {string} options.appRoot application root
 * @param {string} options.webappPath application webapp directory
 * @param {string} options.generatorSpec application-local generator tarball specification
 * @param {{manifestPath: string, cacheDirectory: string, offline: true}} [options.model] learned-model inputs
 * @returns {Promise<void>}
 */
export async function configureFioriApplication({ appRoot, webappPath, generatorSpec, model }) {
    const editor = await generateMockserverConfig(appRoot, {
        webappPath,
        ui5MockYamlConfig: {
            mockDataGenerator: {
                version: generatorSpec,
                options: {
                    mode: 'auto',
                    seed: 42,
                    rowsPerEntity: 10,
                    ...(model
                        ? {
                              modelManifestPath: model.manifestPath,
                              modelCacheDirectory: model.cacheDirectory,
                              modelOffline: true
                          }
                        : {})
                }
            }
        }
    });
    await new Promise((resolve, reject) => {
        editor.commit((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}
