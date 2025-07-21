export enum GeneratorTypes {
    ADD_ANNOTATIONS_TO_DATA = 'Add Local Annotation File',
    ADD_COMPONENT_USAGES = 'Add SAPUI5 Component Usages',
    ADD_NEW_MODEL = 'Add OData Service And SAPUI5 Model',
    CHANGE_DATA_SOURCE = 'Replace OData Service'
}

export interface Credentials {
    username: string;
    password: string;
}
