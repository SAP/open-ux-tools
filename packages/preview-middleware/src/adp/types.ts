import type { UI5FlexLayer } from '@sap-ux/project-access';

export interface DescriptorVariant {
    layer: UI5FlexLayer;
    reference: string;
    id: string;
    namespace: string;
    content: object[];
}
