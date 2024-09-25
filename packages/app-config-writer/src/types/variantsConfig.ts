import type { MiddlewareConfig } from '@sap-ux/preview-middleware';

export const FIORI_TOOLS_RTA_MODE_TRUE = 'true';
export const FIORI_TOOLS_RTA_MODE_VARIANTS = 'forVariants';
export const FIORI_TOOLS_RTA_MODE_ADAPTATION = 'forAdaptation';

export type FioriToolsRtaMode =
    | typeof FIORI_TOOLS_RTA_MODE_TRUE
    | typeof FIORI_TOOLS_RTA_MODE_VARIANTS
    | typeof FIORI_TOOLS_RTA_MODE_ADAPTATION;

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
