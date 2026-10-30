/**
 * Types specific to fiori-migration-writer.
 * For types from @sap-ux/project-access (Manifest, FileName, DirName, etc.),
 * import them directly from that package instead of re-exporting through here.
 */

/**
 * Fiori Elements versions
 */
export const FioriElementsVersion = {
    v2: 'v2',
    v4: 'v4'
} as const;
export type FioriElementsVersion = (typeof FioriElementsVersion)[keyof typeof FioriElementsVersion];

/**
 * Source template information from manifest.json
 */
export interface SapAppSourceTemplate {
    id?: string;
    version?: string;
    toolsId?: string;
}

/**
 * UI5 routing target from manifest.json
 */
export interface SapUi5RoutingTarget {
    name?: string;
    viewName?: string;
    viewId?: string;
    viewType?: string;
    viewLevel?: number;
    transition?: string;
}

/**
 * Middleware proxy configuration for ui5.yaml
 */
export interface MiddlewareProxy {
    name?: string;
    path: string;
    url?: string;
    destination?: string;
    destinationInstance?: string;
    client?: string;
}
