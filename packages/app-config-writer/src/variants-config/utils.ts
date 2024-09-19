import type { FioriToolsDeprecatedPreviewConfig, FioriToolsPreviewConfig, FioriPreviewConfigOptions } from '../types';

/**
 * Checks if a fiori-tools-preview middleware configuration is decprecated.
 *
 * @param config fiori-tools-preview middleware configuration
 * @returns type conversion if true
 */
export function isDeprecatedConfig(config: FioriPreviewConfigOptions): config is FioriToolsDeprecatedPreviewConfig {
    return (config as FioriToolsDeprecatedPreviewConfig)?.component !== undefined;
}

/**
 * Converts a deprecated preview middleware configuration internally to match the configurations provided by the open source @sap-ux/preview-middleware.
 *
 * @param config configuration from the ui5.yaml.
 * @returns {PreviewConfig} configuration for the preview middleware.
 */
export function convertDeprecatedConfig(config: FioriToolsDeprecatedPreviewConfig): FioriToolsPreviewConfig {
    return {
        flp: {
            path: '/test/flpSandbox.html',
            intent: { object: 'preview', action: 'app' },
            theme: config.ui5Theme,
            libs: config.libs
        }
    };
}
