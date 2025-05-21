import type { MiddlewareConfig as PreviewConfig } from '@sap-ux/preview-middleware';

export type FioriToolsDeprecatedPreviewConfig = {
    component: string;
    libs?: boolean;
    ui5Theme?: string;
};

export type PreviewConfigOptions = FioriToolsDeprecatedPreviewConfig | PreviewConfig;

export enum MiddlewareConfigs {
    FioriToolsPreview = 'fiori-tools-preview',
    PreviewMiddleware = 'preview-middleware',
    ReloadMiddleware = 'reload-middleware',
    FioriToolsAppreload = 'fiori-tools-appreload'
}
