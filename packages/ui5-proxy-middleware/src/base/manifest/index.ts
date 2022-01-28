import { SapUiGenericApp } from './sapUiGeneric';
import { SapUi5 } from './sapUi5';
import { SapOvp } from './sapOvp';

export * from './sapUiGeneric';
export * from './sapUi5';
export * from './sapOvp';

export interface Manifest {
    _version?: string;
    'sap.ui'?: SapUi;
    'sap.app': SapApp;
    'sap.ui.generic.app'?: SapUiGenericApp;
    'sap.ovp'?: SapOvp;
    'sap.ui5': SapUi5;
}

export interface SapUi {
    technology?: string;
    icons?: { [key: string]: string };
    deviceTypes: { [key: string]: boolean };
    supportedThemes: Array<string>;
}

export interface SapApp {
    [key: string]: string | object;
    id?: string;
    type?: string;
    dataSources: SapAppDataSources | SapAppDataSourcesWithOptions;
    sourceTemplate?: SapAppSourceTemplate;
    crossNavigation?: CrossNavigation;
}

export interface SapAppSourceTemplate {
    id: string;
    version: string;
}

export interface SapAppDataSources {
    [key: string]: SapAppDataSource;
    mainService: SapAppDataSource;
}

export interface SapAppDataSourcesWithOptions {
    [key: string]: SapAppDataSourceWithOptions;
}

export enum DataSourceType {
    OData = 'OData',
    ODataAnnotation = 'ODataAnnotation'
}

export interface SapAppDataSource {
    uri: string;
    type: DataSourceType;
    settings: SapAppDataSourceSettings;
}

export interface SapAppDataSourceWithOptions extends SapAppDataSource {
    isLocal: boolean;
    order: number;
    isActive: boolean;
}

export type ODataVersionType = '2.0' | '4.0';

export interface SapAppDataSourceSettings {
    [key: string]: boolean | number | string | object;
    annotations?: string[];
    localUri: string;
    odataVersion?: ODataVersionType;
}

export interface Inbound {
    signature: {
        parameters: {};
        additionalParameters: 'allowed';
    };
    semanticObject: string;
    action: string;
    title: string;
    subTitle: string;
    icon: '';
}

export interface CrossNavigation {
    inbounds: {
        [key: string]: Inbound;
    };
}
