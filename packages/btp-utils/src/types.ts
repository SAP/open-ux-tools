export interface AdditionalProperties {
    [key: string]: string | boolean;
    WebIDEEnabled: string;
    WebIDESystem: string;
    WebIDEUsage: string;
    WebIDEAdditionalData: string;
    'sap-client': string;
    'sap-platform': string;
    TrustAll: boolean;
}

export interface Destination extends Partial<AdditionalProperties> {
    Name: string;
    Type: string;
    Authentication: string;
    ProxyType: string;
    Description: string;
    Host: string;
}
