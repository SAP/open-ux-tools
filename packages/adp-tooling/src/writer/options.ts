import type { CustomMiddleware, UI5Config, CustomTask, AbapTarget, Configuration } from '@sap-ux/ui5-config';
import type { AdpWriterConfig } from '../types';

/**
 * Generate the configuration for the middlewares required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5Yaml(ui5Config: UI5Config, config: AdpWriterConfig) {
    const middlewares = config.options?.fioriTools ? getFioriToolsMiddlwares(config) : getOpenSourceMiddlewares(config);
    ui5Config.setConfiguration({ propertiesFileSourceEncoding: "UTF-8" })
    ui5Config.addCustomConfiguration("adp", config?.customConfig?.adp!);
    ui5Config.addCustomMiddleware(middlewares);

    if (config.options?.isRunningInBAS && config.options?.isCloudProject) {
        ui5Config.addUI5Framework("SAPUI5", config.ui5?.ui5Version!, [])
        const tasks = getAdpCloudCustomTasks(config);
        ui5Config.addCustomTasks(tasks);
    }
}

/**
 * Writer configuration with deploy configuration.
 */
type AdpWriterConfigWithDeploy = AdpWriterConfig & { deploy: NonNullable<AdpWriterConfig['deploy']> };

/**
 * Checks if a writer config has a deploy configuration.
 *
 * @param config a writer configuration
 * @returns typecasted config if it contains a deploy config
 */
export function hasDeployConfig(config: AdpWriterConfig): config is AdpWriterConfigWithDeploy {
    return !!config.deploy;
}

/**
 * Generate the configuration for the tasks required for the ui5-deploy.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5DeployYaml(ui5Config: UI5Config, config: AdpWriterConfigWithDeploy) {
    ui5Config.addAbapDeployTask(config.target, config.deploy, config.options?.fioriTools === true);
}

/**
 * Get a list of required middlewares using the Fiori tools.
 *
 * @param config full project configuration
 * @returns list of required middlewares.
 */
function getFioriToolsMiddlwares(config: AdpWriterConfig): CustomMiddleware<unknown>[] {
    return [
        {
            name: 'fiori-tools-preview',
            afterMiddleware: 'compression',
            configuration: {
                adp: {
                    target: config.target,
                    ignoreCertErrors: false
                }
            }
        },
        {
            name: 'fiori-tools-proxy',
            afterMiddleware: 'fiori-tools-preview',
            configuration: {
                ignoreCertErrors: false,
                ui5: {
                    version: config?.ui5?.minVersion,
                    path: ['/resources', '/test-resources'],
                    url: config?.ui5?.ui5EndpointUrl
                },
                backend: [
                    {
                        ...config.target,
                        path: '/sap'
                    }
                ]
            }
        }
    ];
}

/**
 * Get a list of required middlewares using the open source middlewares.
 *
 * @param config full project configuration
 * @returns list of required middlewares.
 */
function getOpenSourceMiddlewares(config: AdpWriterConfig): CustomMiddleware<object | undefined>[] {
    return [
        {
            name: 'preview-middleware',
            afterMiddleware: 'compression',
            configuration: {
                adp: {
                    target: config.target,
                    ignoreCertErrors: false
                },
                rta: {
                    editors: [
                        {
                            path: '/test/adaptation-editor.html',
                            developerMode: true
                        }
                    ]
                }
            }
        },
        {
            name: 'ui5-proxy-middleware',
            afterMiddleware: 'preview-middleware'
        } as CustomMiddleware<undefined>,
        {
            name: 'backend-proxy-middleware',
            afterMiddleware: 'preview-middleware',
            configuration: {
                backend: {
                    ...config.target,
                    path: '/sap'
                },
                options: {
                    secure: true
                }
            }
        }
    ];
}

/**
 * Get a list of required custom tasks using the Fiori tools.
 *
 * @param config full project configuration
 * @returns list of required tasks.
 */
function getAdpCloudCustomTasks(config: AdpWriterConfig & {target: AbapTarget}): CustomTask[] {
    return [
        {
            name: "app-variant-bundler-build",
            beforeTask: "escapeNonAsciiCharacters",
            configuration:{
                type: "abap",
                destination: config.target?.destination,
                appName: config?.flp?.bspName, 
                languages: ( config?.flp?.languages && config.flp.languages.map((language: { sap: string, i18n: string }) => {
                    return {
                        sap: language.sap,
                        i18n: language.i18n
                    }
                })),
                credentials: {
                    username: "env:ABAP_USERNAME",
                    password: "env:ABAP_PASSWORD"
                }
            }
        }
    ];
}