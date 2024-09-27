import type {
    CustomMiddleware,
    UI5Config,
    CustomTask,
    AbapTarget,
    FioriToolsProxyConfigBackend
} from '@sap-ux/ui5-config';
import type {
    CustomConfig,
    AdpWriterConfig,
    InboundContent,
    Language,
    InboundChangeContentAddInboundId,
    Content,
    CloudApp,
    ChangeInboundNavigation,
    InternalInboundNavigation,
    CloudCustomTaskConfig,
    CloudCustomTaskConfigTarget
} from '../types';
/**
 * Generate the configuration for the middlewares required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5Yaml(ui5Config: UI5Config, config: AdpWriterConfig) {
    if (config.options?.fioriTools) {
        addFioriToolsMiddlewares(ui5Config, config);
    } else {
        addOpenSourceMiddlewares(ui5Config, config);
    }
}

/**
 * Generate the configuration for the custom tasks required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5YamlWithCustomTask(ui5Config: UI5Config, config: AdpWriterConfig & { app: CloudApp }) {
    const tasks = getAdpCloudCustomTasks(config);
    ui5Config.addCustomTasks(tasks);
}

/**
 * Generate custom configuration required for the ui5.yaml.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
export function enhanceUI5YamlWithCustomConfig(ui5Config: UI5Config, config?: CustomConfig) {
    if (config?.adp) {
        const { support } = config.adp;
        ui5Config.addCustomConfiguration('adp', { support });
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
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
function addFioriToolsMiddlewares(ui5Config: UI5Config, config: AdpWriterConfig) {
    const backendConfig: Partial<FioriToolsProxyConfigBackend> = { ...config.target };
    backendConfig.url ??= 'https://REQUIRED_FOR_VSCODE.example';
    backendConfig.path = '/sap';

    ui5Config.addFioriToolsAppReloadMiddleware();
    ui5Config.addCustomMiddleware([
        {
            name: 'fiori-tools-preview',
            afterMiddleware: 'fiori-tools-appreload',
            configuration: {
                adp: {
                    target: config.target,
                    ignoreCertErrors: false
                }
            }
        }
    ]);
    ui5Config.addFioriToolsProxydMiddleware(
        {
            ui5: {
                url: config?.ui5?.frameworkUrl,
                version: config?.ui5?.minVersion ?? '' //default to latest if version is not set
            },
            backend: [backendConfig as FioriToolsProxyConfigBackend]
        },
        'fiori-tools-preview'
    );
}

/**
 * Get a list of required middlewares using the open source middlewares.
 *
 * @param ui5Config configuration representing the ui5.yaml
 * @param config full project configuration
 */
function addOpenSourceMiddlewares(ui5Config: UI5Config, config: AdpWriterConfig) {
    ui5Config.addCustomMiddleware([
        {
            name: 'reload-middleware',
            afterMiddleware: 'compression',
            configuration: {
                port: 35729,
                path: 'webapp',
                delay: 300
            }
        },
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
    ]);
}

/**
 * Get a list of required custom tasks for Cloud application.
 *
 * @param config full project configuration
 * @returns list of required tasks.
 */
function getAdpCloudCustomTasks(config: AdpWriterConfig & { target: AbapTarget } & { app: CloudApp }): CustomTask[] {
    let target: CloudCustomTaskConfigTarget;
    if (config.target.destination) {
        target = { destination: config.target.destination };
    } else {
        target = {
            url: config.target.url,
            authenticationType: config.target.authenticationType,
            ignoreCertErrors: false
        };
    }
    const configuration: CloudCustomTaskConfig = {
        type: 'abap',
        appName: config?.app?.bspName,
        languages: config?.app?.languages?.map((language: Language) => {
            return {
                sap: language.sap,
                i18n: language.i18n
            };
        }),
        target
    };
    return [
        {
            name: 'app-variant-bundler-build',
            beforeTask: 'escapeNonAsciiCharacters',
            configuration
        }
    ];
}

/**
 * Get a Inbound change content with provided inboundId.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 * @returns Inbound change content.
 */
function getInboundChangeContentWithExistingInboundId(
    flpConfiguration: ChangeInboundNavigation,
    appId: string
): InboundContent {
    const inboundContent: InboundContent = {
        inboundId: flpConfiguration.inboundId,
        entityPropertyChange: [
            {
                propertyPath: 'title',
                operation: 'UPSERT',
                propertyValue: `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.title}}`
            }
        ]
    };

    if (flpConfiguration.subTitle) {
        inboundContent.entityPropertyChange.push({
            propertyPath: 'subTitle',
            operation: 'UPSERT',
            propertyValue: `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.subTitle}}`
        });
    }

    inboundContent.entityPropertyChange.push({
        propertyPath: 'signature/parameters/sap-appvar-id',
        operation: 'UPSERT',
        propertyValue: {
            required: true,
            filter: {
                value: appId,
                format: 'plain'
            },
            launcherValue: {
                value: appId
            }
        }
    });

    return inboundContent;
}

/**
 * Get a Inbound change content without provided inboundId.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId application id
 * @returns Inbound change content.
 */
function getInboundChangeContentWithNewInboundID(
    flpConfiguration: InternalInboundNavigation,
    appId: string
): InboundChangeContentAddInboundId {
    const content: InboundChangeContentAddInboundId = {
        inbound: {
            [flpConfiguration.inboundId]: {
                action: flpConfiguration.action,
                semanticObject: flpConfiguration.semanticObject,
                title: `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.title}}`,
                signature: {
                    additionalParameters: 'allowed',
                    parameters: flpConfiguration.additionalParameters ?? {}
                }
            }
        }
    };

    if (flpConfiguration.subTitle) {
        content.inbound[
            flpConfiguration.inboundId
        ].subTitle = `{{${appId}_sap.app.crossNavigation.inbounds.${flpConfiguration.inboundId}.subTitle}}`;
    }

    content.inbound[flpConfiguration.inboundId].signature.parameters['sap-appvar-id'] = {
        required: true,
        filter: {
            value: appId,
            format: 'plain'
        },
        launcherValue: {
            value: appId
        }
    };

    return content;
}

/**
 * Generate Inbound change content required for manifest.appdescriptor.
 *
 * @param flpConfiguration FLP cloud project configuration
 * @param appId Application variant id
 * @param manifestChangeContent Application variant change content
 */
export function enhanceManifestChangeContentWithFlpConfig(
    flpConfiguration: InternalInboundNavigation,
    appId: string,
    manifestChangeContent: Content[] = []
): void {
    const inboundChangeContent = flpConfiguration.addInboundId
        ? getInboundChangeContentWithNewInboundID(flpConfiguration, appId)
        : getInboundChangeContentWithExistingInboundId(flpConfiguration as ChangeInboundNavigation, appId);
    if (inboundChangeContent) {
        const addInboundChange = {
            changeType: flpConfiguration.addInboundId ? 'appdescr_app_addNewInbound' : 'appdescr_app_changeInbound',
            content: inboundChangeContent,
            texts: {
                'i18n': 'i18n/i18n.properties'
            }
        };
        const removeOtherInboundsChange = {
            changeType: 'appdescr_app_removeAllInboundsExceptOne',
            content: {
                'inboundId': flpConfiguration.inboundId
            },
            texts: {}
        };

        manifestChangeContent.push(addInboundChange);
        manifestChangeContent.push(removeOtherInboundsChange);
    }
}
