export interface ProjectConfigBase {
    type: 'template';
    kind: 'ui5';
    id: string;
    root: string;
}

export interface GeneratedBaseProjectConfig {
    type: 'generated';
    kind: 'ui5' | 'fe-v4' | 'fe-v2';
    id: string;
    mainServiceUri: string;
    entitySet: string;
    userParams?: Record<string, string | boolean>;
}

export interface GeneratedAdpProjectConfig {
    type: 'generated';
    kind: 'adp';
    baseApp: GeneratedBaseProjectConfig;
    id: string;
}

export const SIMPLE_APP: ProjectConfigBase = {
    type: 'template',
    kind: 'ui5',
    id: 'test.fe.v2.app',
    root: 'simple-app'
};

export const FIORI_ELEMENTS_V2: GeneratedBaseProjectConfig = {
    type: 'generated',
    kind: 'fe-v2',
    id: 'fiori.elements.v2',
    mainServiceUri: '/sap/opu/odata/sap/SERVICE/',
    entitySet: 'RootEntity'
};

export const ADP_FIORI_ELEMENTS_V2: GeneratedAdpProjectConfig = {
    type: 'generated',
    kind: 'adp',
    baseApp: FIORI_ELEMENTS_V2,
    id: 'adp.fiori.elements.v2'
};

export const FIORI_ELEMENTS_V4: GeneratedBaseProjectConfig = {
    type: 'generated',
    kind: 'fe-v4',
    id: 'fiori.elements.v4',
    mainServiceUri: '/sap/opu/odata/sap/SERVICE/',
    entitySet: 'RootEntity'
};

export const ADP_FIORI_ELEMENTS_V4: GeneratedAdpProjectConfig = {
    type: 'generated',
    kind: 'adp',
    baseApp: FIORI_ELEMENTS_V4,
    id: 'adp.fiori.elements.v4'
};

export type UI5ProjectConfig = typeof SIMPLE_APP | typeof FIORI_ELEMENTS_V2 | typeof FIORI_ELEMENTS_V4;
export type AdpProjectConfig = typeof ADP_FIORI_ELEMENTS_V2 | typeof ADP_FIORI_ELEMENTS_V4;

export type ProjectConfig = UI5ProjectConfig | AdpProjectConfig;
