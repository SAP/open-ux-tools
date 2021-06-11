import { Ui5App } from '@sap/ux-ui5-application-template';
import { OdataService } from '@sap/ux-odata-service-template';

export enum TemplateType {
    ListReport = 'lrop',
    Form = 'form',
    OverviewPage = 'ovp'
}

export enum FrameworkVersion {
    V2 = 'v2',
    V4 = 'V4'
}

export interface Template<T = {}> {
    type: TemplateType;
    version: FrameworkVersion;
    settings: T;
}

export interface LROP {
    mainEntity: string;
    navigationEntity?: string;
}
export interface OVP {
    filterEntity: string;
}
export interface FEApp<T> extends Ui5App {
    template: Template<T>;
    annotations: {
        ns?: string;
    };
    service: OdataService;
}
