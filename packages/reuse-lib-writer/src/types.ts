export interface UI5LibConfig {
    libraryname: string;
    namespace: string;
    framework: 'SAPUI5' | 'OpenUI5';
    frameworkVersion: 'string';
    author: 'string';
    typescript: boolean;
}

export interface UI5LibInput extends UI5LibConfig {
    namespaceURI: string;
    librarynamespace: string;
    librarynamespaceURI: string;
    librarybasepath: string;
    frameworklowercase: string;
}

export interface UI5LibInputTS extends UI5LibInput {
    tstypes: string;
    tstypesVersion: string;
}
