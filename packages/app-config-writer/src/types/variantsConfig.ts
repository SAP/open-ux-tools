import type { MiddlewareConfig } from '@sap-ux/preview-middleware';
export interface FioriToolsDeprecatedPreviewConfig {
    component: string;
    libs?: boolean;
    ui5Theme?: string;
}

export type FioriToolsPreviewConfig = MiddlewareConfig;
export type FioriPreviewConfigOptions = FioriToolsDeprecatedPreviewConfig | FioriToolsPreviewConfig;

export enum MiddlewareConfigs {
    'FioriToolsPreview' = 'fiori-tools-preview',
    // ToDo: check for preview-middleware
    'PreviewMiddleware' = 'preview-middleware',
    'ReloadMiddleware' = 'reload-middleware',
    'FioriToolsAppreload' = 'fiori-tools-appreload'
}
