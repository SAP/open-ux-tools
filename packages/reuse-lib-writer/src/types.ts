export interface UI5LibConfig {
    libraryName: string;
    namespace: string;
    framework: 'SAPUI5' | 'OpenUI5';
    frameworkVersion: 'string';
    author: 'string';
    typescript: boolean;
}

export interface UI5LibInput extends UI5LibConfig {
    namespaceURI: string;
    libraryNamespace: string;
    libraryNamespaceURI: string;
    libraryBasepath: string;
}

export interface UI5LibInputTS extends UI5LibInput {
    tsTypes: string;
    tsTypesVersion: string;
}
