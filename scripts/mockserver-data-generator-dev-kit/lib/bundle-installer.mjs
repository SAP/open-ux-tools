import { generateMockserverConfig } from '@sap-ux/mockserver-config-writer';

/**
 * Configure an existing Fiori application through the public config-writer API.
 * This module is bundled into the portable development kit.
 *
 * @param {object} options configuration options
 * @param {string} options.appRoot application root
 * @param {string} options.webappPath application webapp directory
 * @param {string} options.generatorSpec application-local generator tarball specification
 * @returns {Promise<void>}
 */
export async function configureFioriApplication({ appRoot, webappPath, generatorSpec }) {
    const editor = await generateMockserverConfig(appRoot, {
        webappPath,
        ui5MockYamlConfig: {
            mockDataGenerator: {
                version: generatorSpec,
                options: {
                    mode: 'auto',
                    seed: 42,
                    rowsPerEntity: 10
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
