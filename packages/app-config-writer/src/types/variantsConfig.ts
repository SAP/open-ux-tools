import type { MiddlewareConfig as FioriToolsPreviewConfig } from '@sap-ux/preview-middleware';

export type FioriToolsDeprecatedPreviewConfig = {
    component: string;
    libs?: boolean;
    ui5Theme?: string;
};

export type FioriPreviewConfigOptions = FioriToolsDeprecatedPreviewConfig | FioriToolsPreviewConfig;

export enum MiddlewareConfigs {
    FioriToolsPreview = 'fiori-tools-preview',
    // ToDo: check for preview-middleware
    PreviewMiddleware = 'preview-middleware',
    ReloadMiddleware = 'reload-middleware',
    FioriToolsAppreload = 'fiori-tools-appreload'
}
