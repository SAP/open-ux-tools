export interface DescriptorVariant {
    layer: 'VENDOR' | 'CUSTOMER_BASE';
    reference: string;
    id: string;
    namespace: string;
    content: object[];
}
