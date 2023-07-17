import type { UI5FlexLayer } from '@sap-ux/project-access';

export interface DescriptorVariant {
    layer: UI5FlexLayer;
    reference: string;
    id: string;
    namespace: string;
    content: object[];
}

export interface UrlAbapTarget {
    url: string;
    client?: string;
    scp?: boolean;
}

export interface DestinationAbapTarget {
    destination: string;
}

export type AbapTarget =
    | (UrlAbapTarget & Partial<DestinationAbapTarget>)
    | (DestinationAbapTarget & Partial<UrlAbapTarget>);

export interface AdpPreviewConfig {
    target: AbapTarget;

    /**
     * If set to true then certification validation errors are ignored.
     */
    ignoreCertErrors?: boolean;
}

export interface AdpWriterConfig {
    app: {
        id: string;
        reference: string;
        title?: string;
    };
    target: AbapTarget;
    ui5?: {
        minVersion?: string;
    };
    package?: {
        name?: string;
        description?: string;
    };
}
