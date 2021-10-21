export enum OdataVersion {
    v2 = '2',
    v4 = '4'
}
export interface OdataService {
    url?: string;
    client?: string;
    destination?: {
        name: string;
        instance?: string;
    };
    path?: string;
    version: OdataVersion;
    name?: string;
    model?: string;
    metadata?: string;
    annotations?: {
        technicalName: string;
        xml: string;
    };
}
