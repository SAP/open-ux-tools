export interface Destination {
    Authentication: string;
    Description: string;
    Host: string;
    Name: string;
    ProxyType: string;
    TrustAll: boolean;
    Type: string;
    WebIDEEnabled?: boolean;
    WebIDESystem?: string;
    WebIDEUsage?: string;
    WebIDEAdditionalData?: string;
    'sap-client'?: string;
}
